import { defineComponent as N, computed as P, ref as Q, watch as re, onMounted as ye, onBeforeUnmount as ke, openBlock as d, createElementBlock as m, Fragment as R, createElementVNode as g, nextTick as ve, reactive as be, toDisplayString as A, renderList as z, createCommentVNode as M, createTextVNode as Y, normalizeClass as he, withDirectives as $e, withKeys as de, vModelDynamic as we, renderSlot as V, createVNode as F, h as K, withModifiers as te, createBlock as oe, unref as U } from "vue";
import ce from "dompurify";
import Se from "markdown-it";
import Ce from "markdown-it-footnote";
import xe from "markdown-it-task-lists";
const H = {
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
}, T = new Se({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
T.use(xe, { enabled: !1, label: !0, labelAfter: !0 });
T.use(Ce);
function D(t, a) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${t}" aria-label="${a}" title="${a}">${a}</button>`;
}
function ue(t, a = "", n = H) {
  const c = a.toLowerCase();
  if (c === "mermaid" || c === "plantuml" || c === "puml") {
    const L = c === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${L}"><header class="markdown-diagram-toolbar"><span>${L}</span><span class="markdown-diagram-actions">${D("diagram-zoom-out", n.zoomOut)}${D("diagram-fit", n.fit)}${D("diagram-zoom-in", n.zoomIn)}${D("diagram-source", n.source)}${D("diagram-fullscreen", n.fullscreen)}${D("diagram-export-svg", "SVG")}${D("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${n.diagramAria(L)}"><p class="markdown-diagram-status">${n.rendering(L)}</p></div><pre class="markdown-diagram-source" hidden><code>${T.utils.escapeHtml(t)}</code></pre></div>
`;
  }
  const i = t.replace(/\n$/u, "").split(`
`), r = i.length <= 2 && i.every((L) => L.length <= 96), S = i.length > 10, p = a || "text", y = [r ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(a) ? `language-${a}` : ""].filter(Boolean).join(" "), s = y ? ` class="${y}"` : "", w = [r ? "is-compact" : "", S ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), e = S ? `${p} · ${n.lineCount(i.length)}` : p, o = S ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${n.collapseCode}" title="${n.collapseCode}" aria-expanded="false">${n.collapseCode}</button>` : "", l = S ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${n.expandCode(i.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${w ? ` ${w}` : ""}" data-language="${p}" data-code-lines="${String(i.length)}"><header class="markdown-code-toolbar"><span>${e}</span><span class="markdown-code-actions">${o}${D("wrap-code", n.wrap)}${D("copy-code", n.copy)}${D("save-code", n.save)}</span></header><pre class="markdown-code-block${r ? " is-compact" : ""}"><code${s}>${T.utils.escapeHtml(t)}</code></pre>${l}</div></div>
`;
}
T.renderer.rules.fence = (t, a, n, c) => {
  const i = t[a];
  return ue(i.content, i.info.trim().split(/\s+/u)[0] ?? "", c.labels);
};
T.renderer.rules.code_block = (t, a, n, c) => ue(t[a].content, "", c.labels);
T.renderer.rules.table_open = (t, a, n, c) => {
  const i = c.labels ?? H;
  return `<section class="markdown-table-shell" role="region" aria-label="${i.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${D("copy-table", i.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
T.renderer.rules.table_close = () => `</table></div></section>
`;
const ne = T.renderer.rules.code_inline;
T.renderer.rules.code_inline = (t, a, n, c, i) => {
  const r = t[a].content, S = r.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!S || /\s/u.test(r)) return ne ? ne(t, a, n, c, i) : i.renderToken(t, a, n);
  const p = T.utils.escapeHtml(S[1]), y = S[2] ?? "", s = c.labels ?? H;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${p}" data-file-line="${y}" title="${s.openFile(p)}"><code>${T.utils.escapeHtml(r)}</code></button>`;
};
const se = T.renderer.rules.link_open;
T.renderer.rules.link_open = (t, a, n, c, i) => {
  const r = t[a];
  return /^https?:\/\//u.test(r.attrGet("href") ?? "") && (r.attrSet("target", "_blank"), r.attrSet("rel", "noopener noreferrer")), se ? se(t, a, n, c, i) : i.renderToken(t, a, n);
};
function ae(t, a = H) {
  return ce.sanitize(T.render(t, { labels: a }), {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"]
  });
}
function ie(t) {
  var a;
  return (((a = t.match(/^\s*```/gmu)) == null ? void 0 : a.length) ?? 0) % 2 === 1 ? `${t}

\`\`\`` : t;
}
const Ae = ["innerHTML"], qe = ["src"], le = /* @__PURE__ */ N({
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
  setup(t, { emit: a }) {
    const n = t, c = a, i = P(() => n.labels ?? H), r = Q(null), S = Q(null), p = Q(ae(ie(n.text), i.value)), y = Q(""), s = /* @__PURE__ */ new Set();
    let w = 0, e = 0;
    const o = {
      javascript: () => import("highlight.js/lib/languages/javascript"),
      typescript: () => import("highlight.js/lib/languages/typescript"),
      python: () => import("highlight.js/lib/languages/python"),
      go: () => import("highlight.js/lib/languages/go"),
      rust: () => import("highlight.js/lib/languages/rust"),
      json: () => import("highlight.js/lib/languages/json"),
      bash: () => import("highlight.js/lib/languages/bash"),
      sql: () => import("highlight.js/lib/languages/sql")
    };
    async function l(u) {
      window.clearTimeout(w), w = window.setTimeout(async () => {
        p.value = ae(ie(u), i.value), await ve(), L();
      }, n.renderDelay);
    }
    async function L() {
      var h, k, f, $, v, O;
      for (const C of Array.from(((h = r.value) == null ? void 0 : h.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((k = C.textContent) == null ? void 0 : k.trim()) ?? "") && (C.dataset.numeric = "true");
      for (const C of Array.from(((f = r.value) == null ? void 0 : f.querySelectorAll("img")) ?? []))
        C.addEventListener("error", () => {
          C.alt = C.alt || "图片加载失败", C.classList.add("is-load-error");
        }, { once: !0 });
      W();
      for (const [C, x] of Array.from((($ = r.value) == null ? void 0 : $.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        x.dataset.codeIndex = String(C), x.classList.contains("is-collapsible") && s.has(C) && x.classList.remove("is-collapsed");
        for (const q of Array.from(x.querySelectorAll('[data-markdown-action="toggle-code"]')))
          q.setAttribute("aria-expanded", String(!x.classList.contains("is-collapsed")));
        const I = x.querySelector("pre"), j = x.querySelector('[data-markdown-action="wrap-code"]');
        I && j && (j.hidden = I.scrollWidth <= I.clientWidth + 2, j.setAttribute("aria-pressed", String(x.classList.contains("is-wrapped"))));
      }
      await B();
      const u = Array.from(((v = r.value) == null ? void 0 : v.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (u.length === 0) return;
      const b = (await import("highlight.js/lib/core")).default;
      for (const C of u) {
        const x = ((O = Array.from(C.classList).find((q) => q.startsWith("language-"))) == null ? void 0 : O.slice(9)) ?? "", I = o[x];
        if (!I || C.dataset.highlighted === "yes") continue;
        const j = await I();
        b.getLanguage(x) || b.registerLanguage(x, j.default), C.innerHTML = b.highlight(C.textContent ?? "", { language: x }).value, C.dataset.highlighted = "yes";
      }
    }
    function W() {
      var b;
      if (!n.resolveAssetUrl) return;
      const u = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const h of Array.from(((b = r.value) == null ? void 0 : b.querySelectorAll("a[href]")) ?? [])) {
        const k = h.getAttribute("href") ?? "";
        if (!u.test(k) || /^(?:data|blob):/iu.test(k)) continue;
        const f = n.resolveAssetUrl(k);
        f && (h.href = f, h.target = "_blank", h.rel = "noopener noreferrer");
      }
    }
    async function B() {
      var b, h, k, f;
      const u = Array.from(((b = r.value) == null ? void 0 : b.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const $ of u) {
        $.dataset.rendered = "loading";
        const v = $.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", O = ((h = $.querySelector("code")) == null ? void 0 : h.textContent) ?? "", C = $.querySelector(".markdown-diagram-stage");
        if (C)
          try {
            let x = await ((k = n.renderDiagram) == null ? void 0 : k.call(n, { engine: v, source: O, dark: n.dark }));
            if (!x && v === "mermaid") {
              const { default: I } = await import("mermaid");
              I.initialize({ startOnLoad: !1, securityLevel: "strict", theme: n.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), x = (await I.render(`cody-diagram-${String(++e)}`, O)).svg;
            }
            if (!x) throw new Error(v === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            C.innerHTML = _(x), pe(C), $.dataset.rendered = "yes", $.style.setProperty("--diagram-scale", "1");
          } catch (x) {
            C.textContent = x instanceof Error ? x.message : "图表渲染失败", C.classList.add("markdown-diagram-error"), (f = $.querySelector(".markdown-diagram-source")) == null || f.removeAttribute("hidden"), $.dataset.rendered = "error";
          }
      }
    }
    function _(u) {
      const b = ce.sanitize(u, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), h = b.trimStart().startsWith("<svg") ? b : `<svg xmlns="http://www.w3.org/2000/svg">${b}</svg>`, k = new DOMParser().parseFromString(h, "image/svg+xml");
      if (k.querySelector("parsererror")) return "";
      for (const f of k.querySelectorAll("*")) for (const $ of Array.from(f.attributes)) /^on/iu.test($.name) && f.removeAttribute($.name);
      return k.querySelectorAll("script").forEach((f) => f.remove()), new XMLSerializer().serializeToString(k.documentElement);
    }
    function pe(u) {
      if (u.dataset.panReady === "true") return;
      u.dataset.panReady = "true";
      let b = 0, h = 0, k = 0, f = 0;
      u.addEventListener("pointerdown", (v) => {
        v.button === 0 && (b = v.clientX, h = v.clientY, k = u.scrollLeft, f = u.scrollTop, u.setPointerCapture(v.pointerId), u.classList.add("is-panning"));
      }), u.addEventListener("pointermove", (v) => {
        u.hasPointerCapture(v.pointerId) && (u.scrollLeft = k - (v.clientX - b), u.scrollTop = f - (v.clientY - h));
      });
      const $ = (v) => {
        u.hasPointerCapture(v.pointerId) && u.releasePointerCapture(v.pointerId), u.classList.remove("is-panning");
      };
      u.addEventListener("pointerup", $), u.addEventListener("pointercancel", $);
    }
    function G(u, b = 0) {
      const h = Number(u.style.getPropertyValue("--diagram-scale") || "1");
      u.style.setProperty("--diagram-scale", String(b === 0 ? 1 : Math.min(2.5, Math.max(0.4, h + b))));
    }
    function Z(u, b) {
      const h = document.createElement("a");
      h.href = URL.createObjectURL(u), h.download = b, h.click(), URL.revokeObjectURL(h.href);
    }
    async function J(u, b) {
      const h = b.textContent;
      try {
        await navigator.clipboard.writeText(u), b.textContent = "已复制";
      } catch {
        const k = document.createElement("textarea");
        k.value = u, k.style.position = "fixed", k.style.opacity = "0", document.body.appendChild(k), k.select();
        const f = document.execCommand("copy");
        k.remove(), b.textContent = f ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        b.textContent = h;
      }, 1200);
    }
    function fe(u) {
      return Array.from((u == null ? void 0 : u.rows) ?? []).map((b) => Array.from(b.cells).map((h) => {
        var k;
        return `"${((k = h.textContent) == null ? void 0 : k.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function ge(u) {
      var O, C, x, I, j;
      const b = u.target, h = b.closest("img");
      if (h) {
        y.value = h.currentSrc || h.src, (O = S.value) == null || O.showModal();
        return;
      }
      const k = b.closest("[data-markdown-action]");
      if (!k) return;
      const f = k.closest(".markdown-code-shell, .markdown-table-shell"), $ = k.dataset.markdownAction;
      if ($ === "copy-code" && J(((C = f == null ? void 0 : f.querySelector("code")) == null ? void 0 : C.textContent) ?? "", k), $ === "wrap-code") {
        const q = (f == null ? void 0 : f.classList.toggle("is-wrapped")) ?? !1;
        k.textContent = q && i.value.scroll || i.value.wrap, k.setAttribute("aria-pressed", String(q));
      }
      if ($ === "save-code" && Z(new Blob([((x = f == null ? void 0 : f.querySelector("code")) == null ? void 0 : x.textContent) ?? ""], { type: "text/plain" }), `snippet.${(f == null ? void 0 : f.dataset.language) || "txt"}`), $ === "toggle-code" && (f != null && f.classList.contains("is-collapsible"))) {
        const q = Number(f.dataset.codeIndex ?? -1), E = !f.classList.toggle("is-collapsed");
        q >= 0 && (E ? s.add(q) : s.delete(q));
        for (const X of Array.from(f.querySelectorAll('[data-markdown-action="toggle-code"]'))) X.setAttribute("aria-expanded", String(E));
      }
      if ($ === "copy-table" && J(fe((f == null ? void 0 : f.querySelector("table")) ?? null), k), $ === "open-file") {
        const q = k.dataset.filePath ?? "", E = ((I = n.cwd) == null ? void 0 : I.replace(/\/$/u, "")) ?? "", X = q.startsWith("/") && E && q.startsWith(`${E}/`) ? q.slice(E.length + 1) : q.replace(/^\.\//u, "");
        c("openFile", { path: X, line: Number(k.dataset.fileLine || 0) || 1 });
      }
      const v = k.closest(".markdown-diagram-shell");
      if (v && $ === "diagram-zoom-in" && G(v, 0.2), v && $ === "diagram-zoom-out" && G(v, -0.2), v && $ === "diagram-fit" && G(v), v && $ === "diagram-source") {
        const q = v.querySelector(".markdown-diagram-source");
        q && (q.hidden = !q.hidden);
      }
      if (v && $ === "diagram-fullscreen" && ((j = v.requestFullscreen) == null || j.call(v)), v && $ === "diagram-export-svg") {
        const q = v.querySelector("svg");
        q && Z(new Blob([new XMLSerializer().serializeToString(q)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    function ee() {
      var u;
      (u = S.value) == null || u.close();
    }
    return re(() => [n.text, n.labels], ([u]) => {
      l(u);
    }, { deep: !0 }), ye(() => {
      L();
    }), ke(() => window.clearTimeout(w)), (u, b) => (d(), m(R, null, [
      g("div", {
        ref_key: "rootRef",
        ref: r,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: p.value,
        onClick: ge
      }, null, 8, Ae),
      g("dialog", {
        ref_key: "imageDialogRef",
        ref: S,
        class: "cody-markdown-image-dialog",
        onClick: ee
      }, [
        g("button", {
          type: "button",
          "aria-label": "关闭图片预览",
          onClick: ee
        }, "×"),
        g("img", {
          src: y.value,
          alt: "Markdown 图片预览"
        }, null, 8, qe)
      ], 512)
    ], 64));
  }
});
function Le(t) {
  if (!Number.isFinite(t) || t <= 0)
    return "<1s";
  const a = Math.max(1, Math.round(t / 1e3)), n = Math.floor(a / 3600), c = Math.floor(a % 3600 / 60), i = a % 60, r = [];
  return n > 0 && r.push(`${String(n)}h`), (c > 0 || n > 0) && r.push(`${String(c)}m`), r.push(`${String(i > 0 || r.length === 0 ? i : 0)}s`), r.join(" ");
}
function me(t) {
  if (!t || typeof t != "object") return [];
  const a = t;
  return (Array.isArray(a.questions) ? a.questions : []).flatMap((c, i) => {
    if (!c || typeof c != "object") return [];
    const r = c, S = typeof r.question == "string" ? r.question.trim() : "";
    if (!S) return [];
    const p = Array.isArray(r.options) ? r.options : [];
    return [{
      id: typeof r.id == "string" && r.id.trim() ? r.id.trim() : `question-${String(i + 1)}`,
      header: typeof r.header == "string" ? r.header.trim() : "",
      question: S,
      isOther: r.isOther === !0,
      isSecret: r.isSecret === !0,
      options: p.flatMap((y) => {
        if (!y || typeof y != "object") return [];
        const s = y, w = typeof s.label == "string" ? s.label.trim() : "";
        return w ? [{ label: w, description: typeof s.description == "string" ? s.description.trim() : "" }] : [];
      })
    }];
  });
}
function Me(t) {
  var c;
  if (!t || typeof t != "object") return "Codex 请求执行一项受保护操作。";
  const a = t, n = a.reason ?? a.question ?? a.command;
  return typeof n == "string" && n.trim() ? n : ((c = me(t)[0]) == null ? void 0 : c.question) ?? "Codex 请求执行一项受保护操作。";
}
function At(t) {
  var y, s, w;
  const a = [], n = /* @__PURE__ */ new Set(), c = new Map(t.messages.map((e) => [e.id, e])), i = new Map(t.timeline.map((e) => [e.id, e])), r = (e) => {
    if (e.kind === "reasoning") {
      a.push({ id: e.id, kind: "reasoning", text: e.text }), n.add(e.id);
      return;
    }
    if (!e.tool.summary && e.tool.details.length === 0 && !e.tool.output && e.tool.kind !== "fileChange") return;
    if (e.tool.kind !== "fileChange") {
      a.push({ id: e.id, kind: "tool", tool: e.tool }), n.add(e.id);
      return;
    }
    const o = `file-group:${e.turnId ?? e.id}`, l = a.at(-1);
    if (!l || l.kind !== "tool" || l.id !== o) {
      const B = [...new Set(e.tool.details)], _ = {
        id: o,
        kind: "tool",
        tool: {
          ...e.tool,
          title: B.length > 1 ? `文件变更 · ${String(B.length)} 个文件` : "文件变更",
          summary: B.length ? `${String(B.length)} 个文件已更新` : e.tool.summary,
          details: B
        }
      };
      a.push(_), n.add(e.id);
      return;
    }
    const L = [.../* @__PURE__ */ new Set([...l.tool.details, ...e.tool.details])], W = [l.tool.output, e.tool.output].filter(Boolean).join(`

`);
    l.tool = {
      ...l.tool,
      status: /fail|error|cancel|reject/iu.test(`${l.tool.status} ${e.tool.status}`) ? "failed" : e.tool.status,
      title: L.length > 1 ? `文件变更 · ${String(L.length)} 个文件` : "文件变更",
      summary: L.length ? `${String(L.length)} 个文件已更新` : e.tool.summary,
      details: L,
      ...W ? { output: W } : {}
    }, n.add(e.id);
  };
  for (const e of t.presentation ?? [])
    if (e.kind === "message") {
      const o = c.get(e.id);
      o && (a.push({ id: o.id, kind: "message", message: o }), n.add(o.id));
    } else if (e.kind === "timeline") {
      const o = i.get(e.id);
      o && r(o);
    } else if (e.kind === "plan")
      (y = t.plan) != null && y.text && (!e.turnId || e.turnId === t.plan.turnId) && (a.push({ id: e.id, kind: "plan", text: t.plan.text }), n.add(e.id));
    else if (e.kind === "request") {
      const o = t.pendingRequests.find((l) => `request:${l.id}` === e.id);
      o && (a.push({ id: e.id, kind: "request", request: o }), n.add(e.id));
    } else if (e.kind === "failure") {
      const o = e.turnId ? t.turns[e.turnId] : void 0;
      o != null && o.error && (a.push({ id: e.id, kind: "failure", text: o.error }), n.add(e.id));
    } else if (e.kind === "interrupted")
      a.push({ id: e.id, kind: "interrupted", text: "本次回复已停止" }), n.add(e.id);
    else if (e.kind === "worked") {
      const o = e.turnId ? t.turns[e.turnId] : void 0;
      if (o != null && o.completedAtIso) {
        const l = o.startedAtIso ? Date.parse(o.completedAtIso) - Date.parse(o.startedAtIso) : 0;
        a.push({ id: e.id, kind: "worked", label: `Worked for ${Le(l)}` }), n.add(e.id);
      }
    }
  for (const e of t.messages) n.has(e.id) || a.push({ id: e.id, kind: "message", message: e });
  for (const e of t.timeline) n.has(e.id) || r(e);
  const S = `plan:${((s = t.plan) == null ? void 0 : s.turnId) || "current"}`;
  (w = t.plan) != null && w.text && !n.has(S) && a.push({ id: S, kind: "plan", text: t.plan.text });
  for (const e of t.pendingRequests) n.has(`request:${e.id}`) || a.push({ id: `request:${e.id}`, kind: "request", request: e });
  for (const e of Object.values(t.turns))
    e.lifecycle === "failed" && e.error && !n.has(`failure:${e.id}`) && a.push({ id: `failure:${e.id}`, kind: "failure", text: e.error }), e.lifecycle === "interrupted" && !n.has(`interrupted:${e.id}`) && a.push({ id: `interrupted:${e.id}`, kind: "interrupted", text: "本次回复已停止" });
  const p = t.activeTurnId ? t.turns[t.activeTurnId] : void 0;
  if (p) {
    const e = t.pendingRequests.find((o) => !o.turnId || o.turnId === p.id);
    e ? a.push({
      id: `activity:${p.id}`,
      kind: "activity",
      title: e.kind === "approval" ? "等待你的审批" : "等待你的回答",
      detail: "处理后 Codex 会继续本次回复",
      tone: "waiting"
    }) : p.lifecycle === "retrying" ? a.push({
      id: `activity:${p.id}`,
      kind: "activity",
      title: p.retryMessage || "Codex 正在重新连接",
      detail: t.connection.status === "disconnected" ? "连接已中断，等待恢复" : "正在恢复本次回复",
      tone: "retrying"
    }) : p.lifecycle === "running" && a.push({
      id: `activity:${p.id}`,
      kind: "activity",
      title: "Codex 正在工作",
      detail: t.connection.status === "connected" ? "实时更新中" : "等待恢复连接",
      tone: "running"
    });
  }
  return a;
}
const Te = ["data-kind"], Ie = { class: "cody-request-heading" }, Re = { key: 0 }, De = {
  key: 0,
  class: "cody-question-options"
}, Oe = ["onClick"], je = { key: 0 }, ze = ["onUpdate:modelValue", "type", "placeholder"], Be = { class: "cody-request-actions" }, Pe = ["disabled"], Ee = {
  key: 0,
  class: "cody-request-actions"
}, Fe = /* @__PURE__ */ N({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(t, { emit: a }) {
    const n = t, c = a, i = be({}), r = P(() => me(n.request.params)), S = P(() => Me(n.request.params)), p = P(() => r.value.length > 0 && r.value.every((s) => {
      var w;
      return !!((w = i[s.id]) != null && w.trim());
    }));
    re(() => n.request.id, () => {
      for (const s of Object.keys(i)) delete i[s];
    });
    function y() {
      p.value && c("resolveQuestion", n.request.id, Object.fromEntries(r.value.map((s) => [s.id, { answers: [i[s.id].trim()] }])));
    }
    return (s, w) => (d(), m("article", {
      class: "cody-request-card",
      "data-kind": t.request.kind
    }, [
      g("div", Ie, [
        g("strong", null, A(t.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        w[2] || (w[2] = g("small", null, "Agent 已暂停等待", -1))
      ]),
      t.request.kind === "question" && r.value.length ? (d(), m(R, { key: 0 }, [
        (d(!0), m(R, null, z(r.value, (e) => (d(), m("fieldset", {
          key: e.id,
          class: "cody-question-field"
        }, [
          g("legend", null, [
            e.header ? (d(), m("span", Re, A(e.header), 1)) : M("", !0),
            Y(A(e.question), 1)
          ]),
          e.options.length ? (d(), m("div", De, [
            (d(!0), m(R, null, z(e.options, (o) => (d(), m("button", {
              key: o.label,
              type: "button",
              class: he({ selected: i[e.id] === o.label }),
              onClick: (l) => i[e.id] = o.label
            }, [
              g("strong", null, A(o.label), 1),
              o.description ? (d(), m("small", je, A(o.description), 1)) : M("", !0)
            ], 10, Oe))), 128))
          ])) : M("", !0),
          e.options.length === 0 || e.isOther ? $e((d(), m("input", {
            key: 1,
            "onUpdate:modelValue": (o) => i[e.id] = o,
            type: e.isSecret ? "password" : "text",
            placeholder: e.options.length ? "其他回答…" : "输入回答…",
            onKeyup: de(y, ["enter"])
          }, null, 40, ze)), [
            [we, i[e.id]]
          ]) : M("", !0)
        ]))), 128)),
        g("div", Be, [
          g("button", {
            type: "button",
            disabled: !p.value,
            onClick: y
          }, "提交回答", 8, Pe)
        ])
      ], 64)) : (d(), m(R, { key: 1 }, [
        g("p", null, A(S.value), 1),
        t.request.kind === "approval" ? (d(), m("div", Ee, [
          g("button", {
            type: "button",
            onClick: w[0] || (w[0] = (e) => c("resolveApproval", t.request.id, "accept"))
          }, "允许一次"),
          g("button", {
            type: "button",
            "data-tone": "danger",
            onClick: w[1] || (w[1] = (e) => c("resolveApproval", t.request.id, "decline"))
          }, "拒绝")
        ])) : M("", !0)
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
}, We = ["data-role"], Qe = ["data-role"], _e = { class: "cody-message-stack" }, Ge = { class: "cody-message-label" }, Xe = {
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
}, it = {
  key: 7,
  class: "cody-interrupted-card",
  role: "status"
}, lt = ["data-tone"], qt = /* @__PURE__ */ N({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "resolveApproval", "resolveQuestion"],
  setup(t, { emit: a }) {
    const n = a;
    function c(p) {
      return /cancel|interrupt/iu.test(p) ? "neutral" : /fail|error|reject/iu.test(p) ? "danger" : /complete|success|done|approved/iu.test(p) ? "success" : /run|start|pending|wait/iu.test(p) ? "running" : "neutral";
    }
    function i(p) {
      return p.length > 12e3 ? `${p.slice(0, 12e3)}
…输出已截断` : p;
    }
    function r(p, y) {
      n("resolveApproval", p, y);
    }
    function S(p, y) {
      n("resolveQuestion", p, y);
    }
    return (p, y) => (d(), m("section", {
      class: "cody-conversation",
      "data-variant": t.variant,
      "data-cody-component": "conversation-surface"
    }, [
      t.loading ? (d(), m("div", Ve, "正在同步对话…")) : t.entries.length === 0 ? (d(), m("div", Ne, [
        V(p.$slots, "empty", {}, () => [
          y[2] || (y[2] = Y("开始这个需求的开发", -1))
        ])
      ])) : (d(!0), m(R, { key: 2 }, z(t.entries, (s) => {
        var w, e;
        return d(), m(R, {
          key: s.id
        }, [
          s.kind === "worked" ? (d(), m("div", He, [
            g("span", null, A(s.label), 1)
          ])) : s.kind === "message" ? (d(), m("article", {
            key: 1,
            class: "cody-message",
            "data-role": s.message.role
          }, [
            g("div", {
              class: "cody-message-identity",
              "data-role": s.message.role
            }, A(s.message.role === "user" ? "你" : "CW"), 9, Qe),
            g("div", _e, [
              g("div", Ge, A(s.message.role === "user" ? "你" : s.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (w = s.message.skills) != null && w.length ? (d(), m("ul", Xe, [
                (d(!0), m(R, null, z(s.message.skills, (o) => (d(), m("li", {
                  key: `${o.name}:${o.path}`
                }, "$" + A(o.displayName || o.name), 1))), 128))
              ])) : M("", !0),
              s.message.text ? (d(), m("div", Ke, [
                V(p.$slots, "markdown", {
                  message: s.message
                }, () => [
                  F(le, {
                    text: s.message.text,
                    onOpenFile: y[0] || (y[0] = (o) => n("openFile", o))
                  }, null, 8, ["text"])
                ])
              ])) : M("", !0),
              (e = s.message.images) != null && e.length ? (d(), m("div", Ye, [
                (d(!0), m(R, null, z(s.message.images, (o) => (d(), m("img", {
                  key: o,
                  src: o,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, Ze))), 128))
              ])) : M("", !0),
              s.message.text ? (d(), m("button", {
                key: 3,
                class: "cody-copy-button",
                type: "button",
                onClick: (o) => n("copy", s.message.text)
              }, "复制", 8, Je)) : M("", !0)
            ])
          ], 8, We)) : s.kind === "tool" ? (d(), m("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": c(s.tool.status),
            open: c(s.tool.status) === "running"
          }, [
            g("summary", null, [
              y[3] || (y[3] = g("span", null, "⌁", -1)),
              g("strong", null, A(s.tool.title), 1),
              g("small", null, A(s.tool.status), 1)
            ]),
            g("p", null, A(s.tool.summary), 1),
            s.tool.details.length ? (d(), m("ul", tt, [
              (d(!0), m(R, null, z(s.tool.details, (o) => (d(), m("li", { key: o }, A(o), 1))), 128))
            ])) : M("", !0),
            s.tool.output ? (d(), m("pre", ot, A(i(s.tool.output)), 1)) : M("", !0)
          ], 8, et)) : s.kind === "reasoning" ? (d(), m("details", nt, [
            g("summary", null, "✦ " + A(s.title || "推理过程"), 1),
            g("pre", null, A(s.text), 1)
          ])) : s.kind === "plan" ? (d(), m("details", st, [
            y[4] || (y[4] = g("summary", null, "计划", -1)),
            F(le, {
              text: s.text,
              onOpenFile: y[1] || (y[1] = (o) => n("openFile", o))
            }, null, 8, ["text"])
          ])) : s.kind === "request" ? V(p.$slots, "request", {
            request: s.request
          }, () => [
            F(Fe, {
              request: s.request,
              onResolveApproval: r,
              onResolveQuestion: S
            }, null, 8, ["request"])
          ], void 0, 5) : s.kind === "failure" ? (d(), m("details", at, [
            y[5] || (y[5] = g("summary", null, "本次回复失败", -1)),
            g("p", null, A(s.text), 1)
          ])) : s.kind === "interrupted" ? (d(), m("article", it, A(s.text), 1)) : s.kind === "activity" ? (d(), m("article", {
            key: 8,
            class: "cody-conversation-activity",
            "data-tone": s.tone,
            role: "status",
            "aria-live": "polite"
          }, [
            y[6] || (y[6] = g("span", {
              class: "cody-activity-pulse",
              "aria-hidden": "true"
            }, null, -1)),
            g("strong", null, A(s.title), 1),
            g("small", null, A(s.detail), 1)
          ], 8, lt)) : M("", !0)
        ], 64);
      }), 128))
    ], 8, Ue));
  }
}), rt = ["data-variant"], dt = { class: "cody-composer-shell" }, ct = {
  key: 0,
  class: "cody-composer-selected",
  "aria-label": "Selected skills"
}, ut = ["disabled", "aria-label", "onClick"], mt = ["value", "disabled", "placeholder"], pt = { class: "cody-composer-controls" }, ft = {
  key: 0,
  class: "cody-composer-compact-control cody-composer-skill-control",
  title: "为本轮显式选择 Skill"
}, gt = ["disabled"], yt = ["value"], kt = { class: "cody-composer-actions" }, vt = ["disabled"], bt = ["disabled", "aria-label"], ht = {
  key: 1,
  class: "cody-composer-policy"
}, Lt = /* @__PURE__ */ N({
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
  setup(t, { emit: a }) {
    const n = N({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(e, { emit: o }) {
        return () => K("label", { class: "cody-composer-compact-control", title: e.label }, [
          K("select", { value: e.modelValue, disabled: e.disabled, "aria-label": e.label, onChange: (l) => o("update:modelValue", l.target.value) }, e.options.map((l) => K("option", { value: l.value }, l.label)))
        ]);
      }
    }), c = t, i = a, r = P(() => c.skills.filter((e) => !c.selectedSkills.includes(e.value))), S = P(() => {
      var e;
      return ((e = c.permissionOptions.find((o) => o.value === c.selectedPermission)) == null ? void 0 : e.description) ?? "";
    }), p = P(() => c.isRunning && c.selectedSubmitMode === "guide" ? "发送引导" : c.isRunning ? "加入队列" : "发送");
    function y(e, o) {
      var l;
      return ((l = e.find((L) => L.value === o)) == null ? void 0 : l.label) ?? o;
    }
    function s(e) {
      e && !c.selectedSkills.includes(e) && i("update:selected-skills", [...c.selectedSkills, e]);
    }
    function w(e) {
      i("update:selected-skills", c.selectedSkills.filter((o) => o !== e));
    }
    return (e, o) => (d(), m("form", {
      class: "cody-composer",
      "data-variant": t.variant,
      "data-cody-component": "composer-surface",
      onSubmit: o[9] || (o[9] = te((l) => i("send"), ["prevent"]))
    }, [
      g("div", dt, [
        t.selectedSkills.length ? (d(), m("div", ct, [
          (d(!0), m(R, null, z(t.selectedSkills, (l) => (d(), m("span", {
            key: l,
            class: "cody-composer-chip"
          }, [
            Y(" $" + A(y(t.skills, l)) + " ", 1),
            g("button", {
              type: "button",
              disabled: t.disabled,
              "aria-label": `移除 Skill ${y(t.skills, l)}`,
              onClick: (L) => w(l)
            }, "×", 8, ut)
          ]))), 128))
        ])) : M("", !0),
        g("textarea", {
          value: t.draft,
          rows: "1",
          disabled: t.disabled,
          placeholder: t.placeholder,
          onInput: o[0] || (o[0] = (l) => i("update:draft", l.target.value)),
          onKeydown: o[1] || (o[1] = de(te((l) => i("send"), ["exact", "prevent"]), ["enter"]))
        }, null, 40, mt),
        g("div", pt, [
          V(e.$slots, "leading"),
          t.skills.length ? (d(), m("label", ft, [
            o[11] || (o[11] = g("span", {
              class: "cody-composer-icon",
              "aria-hidden": "true"
            }, "✦", -1)),
            g("select", {
              value: "",
              disabled: t.disabled,
              "aria-label": "添加 Skill",
              onChange: o[2] || (o[2] = (l) => s(l.target.value))
            }, [
              o[10] || (o[10] = g("option", { value: "" }, "Skills", -1)),
              (d(!0), m(R, null, z(r.value, (l) => (d(), m("option", {
                key: l.value,
                value: l.value
              }, "$" + A(l.label), 9, yt))), 128))
            ], 40, gt)
          ])) : M("", !0),
          t.collaborationModes.length ? (d(), oe(U(n), {
            key: 1,
            label: "协作模式",
            "model-value": t.selectedCollaborationMode,
            options: t.collaborationModes,
            disabled: t.disabled || t.isRunning,
            "onUpdate:modelValue": o[3] || (o[3] = (l) => i("update:collaboration-mode", l))
          }, null, 8, ["model-value", "options", "disabled"])) : M("", !0),
          F(U(n), {
            label: "提交策略",
            "model-value": t.selectedSubmitMode,
            options: t.submitModes,
            disabled: t.disabled,
            "onUpdate:modelValue": o[4] || (o[4] = (l) => i("update:submit-mode", l))
          }, null, 8, ["model-value", "options", "disabled"]),
          t.models.length ? (d(), oe(U(n), {
            key: 2,
            label: "模型",
            "model-value": t.selectedModel,
            options: t.models,
            disabled: t.disabled || t.isRunning,
            "onUpdate:modelValue": o[5] || (o[5] = (l) => i("update:model", l))
          }, null, 8, ["model-value", "options", "disabled"])) : M("", !0),
          F(U(n), {
            label: "推理强度",
            "model-value": t.selectedReasoning,
            options: t.reasoningOptions,
            disabled: t.disabled || t.isRunning,
            "onUpdate:modelValue": o[6] || (o[6] = (l) => i("update:reasoning", l))
          }, null, 8, ["model-value", "options", "disabled"]),
          F(U(n), {
            label: "权限",
            "model-value": t.selectedPermission,
            options: t.permissionOptions,
            disabled: t.disabled || t.isRunning,
            "onUpdate:modelValue": o[7] || (o[7] = (l) => i("update:permission", l))
          }, null, 8, ["model-value", "options", "disabled"]),
          V(e.$slots, "controls"),
          g("div", kt, [
            t.isRunning ? (d(), m("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: t.disabled,
              onClick: o[8] || (o[8] = (l) => i("stop"))
            }, "停止", 8, vt)) : M("", !0),
            g("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: t.disabled || !t.draft.trim(),
              "aria-label": p.value
            }, "↑", 8, bt)
          ])
        ]),
        S.value ? (d(), m("p", ht, A(S.value), 1)) : M("", !0)
      ])
    ], 40, rt));
  }
});
export {
  Lt as CodyComposer,
  qt as CodyConversation,
  le as CodyMarkdown,
  Fe as CodyRequestCard,
  H as DEFAULT_CODY_MARKDOWN_LABELS,
  At as conversationEntriesFromState,
  me as questionFieldsFromParams,
  ae as renderCodyMarkdown,
  Me as requestSummary,
  ie as stabilizeStreamingMarkdown
};
