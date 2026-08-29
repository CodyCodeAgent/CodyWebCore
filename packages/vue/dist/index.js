import { defineComponent as W, computed as j, ref as N, watch as ue, onMounted as ye, onBeforeUnmount as be, openBlock as l, createElementBlock as i, Fragment as R, createElementVNode as u, nextTick as he, reactive as $e, toDisplayString as $, renderList as z, createCommentVNode as T, createTextVNode as J, normalizeClass as we, withDirectives as Ce, withKeys as me, vModelDynamic as Se, renderSlot as H, createVNode as V, unref as _, h as Y, withModifiers as se, createBlock as ne, shallowRef as xe, getCurrentScope as Ae, onScopeDispose as qe } from "vue";
import { buildApprovalRiskSummary as Le, toolStatusTone as ae, buildToolOutputPreview as Me, isToolOutputTruncated as Te, toolOutputToggleLabel as Re } from "@codycodeagent/cody-web-core/presentation";
import pe from "dompurify";
import Ie from "markdown-it";
import De from "markdown-it-footnote";
import Oe from "markdown-it-task-lists";
import { formatTurnDuration as _e, createConversationState as Z } from "@codycodeagent/cody-web-core/conversation";
import { composerHasContent as je } from "@codycodeagent/cody-web-core/composer";
import { createConversationController as ze } from "@codycodeagent/cody-web-core/client";
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
}, I = new Ie({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
I.use(Oe, { enabled: !1, label: !0, labelAfter: !0 });
I.use(De);
function O(t, n) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${t}" aria-label="${n}" title="${n}">${n}</button>`;
}
function fe(t, n = "", o = G) {
  const r = n.toLowerCase();
  if (r === "mermaid" || r === "plantuml" || r === "puml") {
    const c = r === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${c}"><header class="markdown-diagram-toolbar"><span>${c}</span><span class="markdown-diagram-actions">${O("diagram-zoom-out", o.zoomOut)}${O("diagram-fit", o.fit)}${O("diagram-zoom-in", o.zoomIn)}${O("diagram-source", o.source)}${O("diagram-fullscreen", o.fullscreen)}${O("diagram-export-svg", "SVG")}${O("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${o.diagramAria(c)}"><p class="markdown-diagram-status">${o.rendering(c)}</p></div><pre class="markdown-diagram-source" hidden><code>${I.utils.escapeHtml(t)}</code></pre></div>
`;
  }
  const d = t.replace(/\n$/u, "").split(`
`), f = d.length <= 2 && d.every((c) => c.length <= 96), S = d.length > 10, m = n || "text", g = [f ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(n) ? `language-${n}` : ""].filter(Boolean).join(" "), s = g ? ` class="${g}"` : "", x = [f ? "is-compact" : "", S ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), A = S ? `${m} · ${o.lineCount(d.length)}` : m, e = S ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${o.collapseCode}" title="${o.collapseCode}" aria-expanded="false">${o.collapseCode}</button>` : "", a = S ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${o.expandCode(d.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${x ? ` ${x}` : ""}" data-language="${m}" data-code-lines="${String(d.length)}"><header class="markdown-code-toolbar"><span>${A}</span><span class="markdown-code-actions">${e}${O("wrap-code", o.wrap)}${O("copy-code", o.copy)}${O("save-code", o.save)}</span></header><pre class="markdown-code-block${f ? " is-compact" : ""}"><code${s}>${I.utils.escapeHtml(t)}</code></pre>${a}</div></div>
`;
}
I.renderer.rules.fence = (t, n, o, r) => {
  const d = t[n];
  return fe(d.content, d.info.trim().split(/\s+/u)[0] ?? "", r.labels);
};
I.renderer.rules.code_block = (t, n, o, r) => fe(t[n].content, "", r.labels);
I.renderer.rules.table_open = (t, n, o, r) => {
  const d = r.labels ?? G;
  return `<section class="markdown-table-shell" role="region" aria-label="${d.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${O("copy-table", d.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
I.renderer.rules.table_close = () => `</table></div></section>
`;
const le = I.renderer.rules.code_inline;
I.renderer.rules.code_inline = (t, n, o, r, d) => {
  const f = t[n].content, S = f.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!S || /\s/u.test(f)) return le ? le(t, n, o, r, d) : d.renderToken(t, n, o);
  const m = I.utils.escapeHtml(S[1]), g = S[2] ?? "", s = r.labels ?? G;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${m}" data-file-line="${g}" title="${s.openFile(m)}"><code>${I.utils.escapeHtml(f)}</code></button>`;
};
const ie = I.renderer.rules.link_open;
I.renderer.rules.link_open = (t, n, o, r, d) => {
  const f = t[n];
  return /^https?:\/\//u.test(f.attrGet("href") ?? "") && (f.attrSet("target", "_blank"), f.attrSet("rel", "noopener noreferrer")), ie ? ie(t, n, o, r, d) : d.renderToken(t, n, o);
};
function re(t, n = G) {
  return pe.sanitize(I.render(t, { labels: n }), {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"]
  });
}
function de(t) {
  var n;
  return (((n = t.match(/^\s*```/gmu)) == null ? void 0 : n.length) ?? 0) % 2 === 1 ? `${t}

\`\`\`` : t;
}
const Be = ["innerHTML"], Pe = ["src"], ce = /* @__PURE__ */ W({
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
  setup(t, { emit: n }) {
    const o = t, r = n, d = j(() => o.labels ?? G), f = N(null), S = N(null), m = N(re(de(o.text), d.value)), g = N(""), s = /* @__PURE__ */ new Set();
    let x = 0, A = 0;
    const e = {
      javascript: () => import("highlight.js/lib/languages/javascript"),
      typescript: () => import("highlight.js/lib/languages/typescript"),
      python: () => import("highlight.js/lib/languages/python"),
      go: () => import("highlight.js/lib/languages/go"),
      rust: () => import("highlight.js/lib/languages/rust"),
      json: () => import("highlight.js/lib/languages/json"),
      bash: () => import("highlight.js/lib/languages/bash"),
      sql: () => import("highlight.js/lib/languages/sql")
    };
    async function a(p) {
      window.clearTimeout(x), x = window.setTimeout(async () => {
        m.value = re(de(p), d.value), await he(), c();
      }, o.renderDelay);
    }
    async function c() {
      var w, y, v, C, b, B;
      for (const q of Array.from(((w = f.value) == null ? void 0 : w.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((y = q.textContent) == null ? void 0 : y.trim()) ?? "") && (q.dataset.numeric = "true");
      for (const q of Array.from(((v = f.value) == null ? void 0 : v.querySelectorAll("img")) ?? []))
        q.addEventListener("error", () => {
          q.alt = q.alt || "图片加载失败", q.classList.add("is-load-error");
        }, { once: !0 });
      k();
      for (const [q, L] of Array.from(((C = f.value) == null ? void 0 : C.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        L.dataset.codeIndex = String(q), L.classList.contains("is-collapsible") && s.has(q) && L.classList.remove("is-collapsed");
        for (const M of Array.from(L.querySelectorAll('[data-markdown-action="toggle-code"]')))
          M.setAttribute("aria-expanded", String(!L.classList.contains("is-collapsed")));
        const D = L.querySelector("pre"), P = L.querySelector('[data-markdown-action="wrap-code"]');
        D && P && (P.hidden = D.scrollWidth <= D.clientWidth + 2, P.setAttribute("aria-pressed", String(L.classList.contains("is-wrapped"))));
      }
      await E();
      const p = Array.from(((b = f.value) == null ? void 0 : b.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (p.length === 0) return;
      const h = (await import("highlight.js/lib/core")).default;
      for (const q of p) {
        const L = ((B = Array.from(q.classList).find((M) => M.startsWith("language-"))) == null ? void 0 : B.slice(9)) ?? "", D = e[L];
        if (!D || q.dataset.highlighted === "yes") continue;
        const P = await D();
        h.getLanguage(L) || h.registerLanguage(L, P.default), q.innerHTML = h.highlight(q.textContent ?? "", { language: L }).value, q.dataset.highlighted = "yes";
      }
    }
    function k() {
      var h;
      if (!o.resolveAssetUrl) return;
      const p = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const w of Array.from(((h = f.value) == null ? void 0 : h.querySelectorAll("a[href]")) ?? [])) {
        const y = w.getAttribute("href") ?? "";
        if (!p.test(y) || /^(?:data|blob):/iu.test(y)) continue;
        const v = o.resolveAssetUrl(y);
        v && (w.href = v, w.target = "_blank", w.rel = "noopener noreferrer");
      }
    }
    async function E() {
      var h, w, y, v;
      const p = Array.from(((h = f.value) == null ? void 0 : h.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const C of p) {
        C.dataset.rendered = "loading";
        const b = C.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", B = ((w = C.querySelector("code")) == null ? void 0 : w.textContent) ?? "", q = C.querySelector(".markdown-diagram-stage");
        if (q)
          try {
            let L = await ((y = o.renderDiagram) == null ? void 0 : y.call(o, { engine: b, source: B, dark: o.dark }));
            if (!L && b === "mermaid") {
              const { default: D } = await import("mermaid");
              D.initialize({ startOnLoad: !1, securityLevel: "strict", theme: o.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), L = (await D.render(`cody-diagram-${String(++A)}`, B)).svg;
            }
            if (!L) throw new Error(b === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            q.innerHTML = F(L), Q(q), C.dataset.rendered = "yes", C.style.setProperty("--diagram-scale", "1");
          } catch (L) {
            q.textContent = L instanceof Error ? L.message : "图表渲染失败", q.classList.add("markdown-diagram-error"), (v = C.querySelector(".markdown-diagram-source")) == null || v.removeAttribute("hidden"), C.dataset.rendered = "error";
          }
      }
    }
    function F(p) {
      const h = pe.sanitize(p, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), w = h.trimStart().startsWith("<svg") ? h : `<svg xmlns="http://www.w3.org/2000/svg">${h}</svg>`, y = new DOMParser().parseFromString(w, "image/svg+xml");
      if (y.querySelector("parsererror")) return "";
      for (const v of y.querySelectorAll("*")) for (const C of Array.from(v.attributes)) /^on/iu.test(C.name) && v.removeAttribute(C.name);
      return y.querySelectorAll("script").forEach((v) => v.remove()), new XMLSerializer().serializeToString(y.documentElement);
    }
    function Q(p) {
      if (p.dataset.panReady === "true") return;
      p.dataset.panReady = "true";
      let h = 0, w = 0, y = 0, v = 0;
      p.addEventListener("pointerdown", (b) => {
        b.button === 0 && (h = b.clientX, w = b.clientY, y = p.scrollLeft, v = p.scrollTop, p.setPointerCapture(b.pointerId), p.classList.add("is-panning"));
      }), p.addEventListener("pointermove", (b) => {
        p.hasPointerCapture(b.pointerId) && (p.scrollLeft = y - (b.clientX - h), p.scrollTop = v - (b.clientY - w));
      });
      const C = (b) => {
        p.hasPointerCapture(b.pointerId) && p.releasePointerCapture(b.pointerId), p.classList.remove("is-panning");
      };
      p.addEventListener("pointerup", C), p.addEventListener("pointercancel", C);
    }
    function K(p, h = 0) {
      const w = Number(p.style.getPropertyValue("--diagram-scale") || "1");
      p.style.setProperty("--diagram-scale", String(h === 0 ? 1 : Math.min(2.5, Math.max(0.4, w + h))));
    }
    function ee(p, h) {
      const w = document.createElement("a");
      w.href = URL.createObjectURL(p), w.download = h, w.click(), URL.revokeObjectURL(w.href);
    }
    async function te(p, h) {
      const w = h.textContent;
      try {
        await navigator.clipboard.writeText(p), h.textContent = "已复制";
      } catch {
        const y = document.createElement("textarea");
        y.value = p, y.style.position = "fixed", y.style.opacity = "0", document.body.appendChild(y), y.select();
        const v = document.execCommand("copy");
        y.remove(), h.textContent = v ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        h.textContent = w;
      }, 1200);
    }
    function ve(p) {
      return Array.from((p == null ? void 0 : p.rows) ?? []).map((h) => Array.from(h.cells).map((w) => {
        var y;
        return `"${((y = w.textContent) == null ? void 0 : y.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function ke(p) {
      var B, q, L, D, P;
      const h = p.target, w = h.closest("img");
      if (w) {
        g.value = w.currentSrc || w.src, (B = S.value) == null || B.showModal();
        return;
      }
      const y = h.closest("[data-markdown-action]");
      if (!y) return;
      const v = y.closest(".markdown-code-shell, .markdown-table-shell"), C = y.dataset.markdownAction;
      if (C === "copy-code" && te(((q = v == null ? void 0 : v.querySelector("code")) == null ? void 0 : q.textContent) ?? "", y), C === "wrap-code") {
        const M = (v == null ? void 0 : v.classList.toggle("is-wrapped")) ?? !1;
        y.textContent = M && d.value.scroll || d.value.wrap, y.setAttribute("aria-pressed", String(M));
      }
      if (C === "save-code" && ee(new Blob([((L = v == null ? void 0 : v.querySelector("code")) == null ? void 0 : L.textContent) ?? ""], { type: "text/plain" }), `snippet.${(v == null ? void 0 : v.dataset.language) || "txt"}`), C === "toggle-code" && (v != null && v.classList.contains("is-collapsible"))) {
        const M = Number(v.dataset.codeIndex ?? -1), U = !v.classList.toggle("is-collapsed");
        M >= 0 && (U ? s.add(M) : s.delete(M));
        for (const X of Array.from(v.querySelectorAll('[data-markdown-action="toggle-code"]'))) X.setAttribute("aria-expanded", String(U));
      }
      if (C === "copy-table" && te(ve((v == null ? void 0 : v.querySelector("table")) ?? null), y), C === "open-file") {
        const M = y.dataset.filePath ?? "", U = ((D = o.cwd) == null ? void 0 : D.replace(/\/$/u, "")) ?? "", X = M.startsWith("/") && U && M.startsWith(`${U}/`) ? M.slice(U.length + 1) : M.replace(/^\.\//u, "");
        r("openFile", { path: X, line: Number(y.dataset.fileLine || 0) || 1 });
      }
      const b = y.closest(".markdown-diagram-shell");
      if (b && C === "diagram-zoom-in" && K(b, 0.2), b && C === "diagram-zoom-out" && K(b, -0.2), b && C === "diagram-fit" && K(b), b && C === "diagram-source") {
        const M = b.querySelector(".markdown-diagram-source");
        M && (M.hidden = !M.hidden);
      }
      if (b && C === "diagram-fullscreen" && ((P = b.requestFullscreen) == null || P.call(b)), b && C === "diagram-export-svg") {
        const M = b.querySelector("svg");
        M && ee(new Blob([new XMLSerializer().serializeToString(M)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    function oe() {
      var p;
      (p = S.value) == null || p.close();
    }
    return ue(() => [o.text, o.labels], ([p]) => {
      a(p);
    }, { deep: !0 }), ye(() => {
      c();
    }), be(() => window.clearTimeout(x)), (p, h) => (l(), i(R, null, [
      u("div", {
        ref_key: "rootRef",
        ref: f,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: m.value,
        onClick: ke
      }, null, 8, Be),
      u("dialog", {
        ref_key: "imageDialogRef",
        ref: S,
        class: "cody-markdown-image-dialog",
        onClick: oe
      }, [
        u("button", {
          type: "button",
          "aria-label": "关闭图片预览",
          onClick: oe
        }, "×"),
        u("img", {
          src: g.value,
          alt: "Markdown 图片预览"
        }, null, 8, Pe)
      ], 512)
    ], 64));
  }
});
function ge(t) {
  if (!t || typeof t != "object") return [];
  const n = t;
  return (Array.isArray(n.questions) ? n.questions : []).flatMap((r, d) => {
    if (!r || typeof r != "object") return [];
    const f = r, S = typeof f.question == "string" ? f.question.trim() : "";
    if (!S) return [];
    const m = Array.isArray(f.options) ? f.options : [];
    return [{
      id: typeof f.id == "string" && f.id.trim() ? f.id.trim() : `question-${String(d + 1)}`,
      header: typeof f.header == "string" ? f.header.trim() : "",
      question: S,
      isOther: f.isOther === !0,
      isSecret: f.isSecret === !0,
      options: m.flatMap((g) => {
        if (!g || typeof g != "object") return [];
        const s = g, x = typeof s.label == "string" ? s.label.trim() : "";
        return x ? [{ label: x, description: typeof s.description == "string" ? s.description.trim() : "" }] : [];
      })
    }];
  });
}
function Ee(t) {
  var r;
  if (!t || typeof t != "object") return "Codex 请求执行一项受保护操作。";
  const n = t, o = n.reason ?? n.question ?? n.command;
  return typeof o == "string" && o.trim() ? o : ((r = ge(t)[0]) == null ? void 0 : r.question) ?? "Codex 请求执行一项受保护操作。";
}
function Qt(t) {
  var g, s, x, A;
  const n = [], o = /* @__PURE__ */ new Set(), r = new Map(t.messages.map((e) => [e.id, e])), d = new Map(t.timeline.map((e) => [e.id, e])), f = (e) => {
    if (e.kind === "reasoning") {
      n.push({ id: e.id, kind: "reasoning", text: e.text }), o.add(e.id);
      return;
    }
    if (!e.tool.summary && e.tool.details.length === 0 && !e.tool.output && e.tool.kind !== "fileChange") return;
    if (e.tool.kind !== "fileChange") {
      n.push({ id: e.id, kind: "tool", tool: e.tool }), o.add(e.id);
      return;
    }
    const a = `file-group:${e.turnId ?? e.id}`, c = n.at(-1);
    if (!c || c.kind !== "tool" || c.id !== a) {
      const F = [...new Set(e.tool.details)], Q = {
        id: a,
        kind: "tool",
        tool: {
          ...e.tool,
          title: F.length > 1 ? `文件变更 · ${String(F.length)} 个文件` : "文件变更",
          summary: F.length ? `${String(F.length)} 个文件已更新` : e.tool.summary,
          details: F
        }
      };
      n.push(Q), o.add(e.id);
      return;
    }
    const k = [.../* @__PURE__ */ new Set([...c.tool.details, ...e.tool.details])], E = [c.tool.output, e.tool.output].filter(Boolean).join(`

`);
    c.tool = {
      ...c.tool,
      status: /fail|error|cancel|reject/iu.test(`${c.tool.status} ${e.tool.status}`) ? "failed" : e.tool.status,
      title: k.length > 1 ? `文件变更 · ${String(k.length)} 个文件` : "文件变更",
      summary: k.length ? `${String(k.length)} 个文件已更新` : e.tool.summary,
      details: k,
      ...E ? { output: E } : {}
    }, o.add(e.id);
  };
  for (const e of t.presentation ?? [])
    if (e.kind === "message") {
      const a = r.get(e.id);
      a && (n.push({ id: a.id, kind: "message", message: a }), o.add(a.id));
    } else if (e.kind === "timeline") {
      const a = d.get(e.id);
      a && f(a);
    } else if (e.kind === "plan")
      (g = t.plan) != null && g.text && (!e.turnId || e.turnId === t.plan.turnId) && (n.push({ id: e.id, kind: "plan", text: t.plan.text }), o.add(e.id));
    else if (e.kind === "request") {
      const a = t.pendingRequests.find((c) => `request:${c.id}` === e.id);
      a && (n.push({ id: e.id, kind: "request", request: a }), o.add(e.id));
    } else if (e.kind === "failure") {
      const a = e.turnId ? t.turns[e.turnId] : void 0;
      a != null && a.error && (n.push({ id: e.id, kind: "failure", text: a.error }), o.add(e.id));
    } else if (e.kind === "interrupted")
      n.push({ id: e.id, kind: "interrupted", text: "本次回复已停止" }), o.add(e.id);
    else if (e.kind === "worked") {
      const a = e.turnId ? t.turns[e.turnId] : void 0;
      if (a != null && a.completedAtIso) {
        const c = a.startedAtIso ? Date.parse(a.completedAtIso) - Date.parse(a.startedAtIso) : 0;
        n.push({ id: e.id, kind: "worked", label: `Worked for ${_e(c)}` }), o.add(e.id);
      }
    }
  for (const e of t.messages) o.has(e.id) || n.push({ id: e.id, kind: "message", message: e });
  for (const e of t.timeline) o.has(e.id) || f(e);
  const S = `plan:${((s = t.plan) == null ? void 0 : s.turnId) || "current"}`;
  (x = t.plan) != null && x.text && !o.has(S) && n.push({ id: S, kind: "plan", text: t.plan.text });
  for (const e of t.pendingRequests) o.has(`request:${e.id}`) || n.push({ id: `request:${e.id}`, kind: "request", request: e });
  for (const e of Object.values(t.turns))
    e.lifecycle === "failed" && e.error && !o.has(`failure:${e.id}`) && n.push({ id: `failure:${e.id}`, kind: "failure", text: e.error }), e.lifecycle === "interrupted" && !o.has(`interrupted:${e.id}`) && n.push({ id: `interrupted:${e.id}`, kind: "interrupted", text: "本次回复已停止" });
  const m = t.activeTurnId ? t.turns[t.activeTurnId] : void 0;
  if (m) {
    const e = t.pendingRequests.find((a) => !a.turnId || a.turnId === m.id);
    e ? n.push({
      id: `activity:${m.id}`,
      kind: "activity",
      title: e.kind === "approval" ? "等待你的审批" : "等待你的回答",
      detail: "处理后 Codex 会继续本次回复",
      tone: "waiting"
    }) : m.lifecycle === "retrying" ? n.push({
      id: `activity:${m.id}`,
      kind: "activity",
      title: m.retryMessage || "Codex 正在重新连接",
      detail: t.connection.status === "disconnected" ? "连接已中断，等待恢复" : "正在恢复本次回复",
      tone: "retrying"
    }) : m.lifecycle === "running" && n.push({
      id: `activity:${m.id}`,
      kind: "activity",
      title: ((A = t.activity) == null ? void 0 : A.label) || "Codex 正在工作",
      detail: t.connection.status === "connected" ? "实时更新中" : "等待恢复连接",
      tone: "running"
    });
  }
  return n;
}
const Fe = ["data-kind"], Ue = { class: "cody-request-heading" }, Ve = { key: 0 }, Ne = {
  key: 0,
  class: "cody-question-options"
}, He = ["onClick"], We = { key: 0 }, Ge = ["onUpdate:modelValue", "type", "placeholder"], Qe = { class: "cody-request-actions" }, Ke = ["disabled"], Xe = { class: "cody-approval-risk-heading" }, Ye = ["data-level"], Ze = { class: "cody-approval-risk-subject" }, Je = {
  key: 0,
  class: "cody-approval-risk-labels"
}, et = {
  key: 1,
  class: "cody-approval-risk-details"
}, tt = { class: "cody-approval-risk-recommendation" }, ot = { key: 1 }, st = {
  key: 2,
  class: "cody-request-actions"
}, nt = /* @__PURE__ */ W({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(t, { emit: n }) {
    const o = t, r = n, d = $e({}), f = j(() => ge(o.request.params)), S = j(() => Ee(o.request.params)), m = j(() => o.request.kind === "approval" ? Le({ method: o.request.method, params: o.request.params }) : null), g = j(() => f.value.length > 0 && f.value.every((x) => {
      var A;
      return !!((A = d[x.id]) != null && A.trim());
    }));
    ue(() => o.request.id, () => {
      for (const x of Object.keys(d)) delete d[x];
    });
    function s() {
      g.value && r("resolveQuestion", o.request.id, Object.fromEntries(f.value.map((x) => [x.id, { answers: [d[x.id].trim()] }])));
    }
    return (x, A) => (l(), i("article", {
      class: "cody-request-card",
      "data-kind": t.request.kind
    }, [
      u("div", Ue, [
        u("strong", null, $(t.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        A[2] || (A[2] = u("small", null, "Agent 已暂停等待", -1))
      ]),
      t.request.kind === "question" && f.value.length ? (l(), i(R, { key: 0 }, [
        (l(!0), i(R, null, z(f.value, (e) => (l(), i("fieldset", {
          key: e.id,
          class: "cody-question-field"
        }, [
          u("legend", null, [
            e.header ? (l(), i("span", Ve, $(e.header), 1)) : T("", !0),
            J($(e.question), 1)
          ]),
          e.options.length ? (l(), i("div", Ne, [
            (l(!0), i(R, null, z(e.options, (a) => (l(), i("button", {
              key: a.label,
              type: "button",
              class: we({ selected: d[e.id] === a.label }),
              onClick: (c) => d[e.id] = a.label
            }, [
              u("strong", null, $(a.label), 1),
              a.description ? (l(), i("small", We, $(a.description), 1)) : T("", !0)
            ], 10, He))), 128))
          ])) : T("", !0),
          e.options.length === 0 || e.isOther ? Ce((l(), i("input", {
            key: 1,
            "onUpdate:modelValue": (a) => d[e.id] = a,
            type: e.isSecret ? "password" : "text",
            placeholder: e.options.length ? "其他回答…" : "输入回答…",
            onKeyup: me(s, ["enter"])
          }, null, 40, Ge)), [
            [Se, d[e.id]]
          ]) : T("", !0)
        ]))), 128)),
        u("div", Qe, [
          u("button", {
            type: "button",
            disabled: !g.value,
            onClick: s
          }, "提交回答", 8, Ke)
        ])
      ], 64)) : (l(), i(R, { key: 1 }, [
        m.value ? (l(), i(R, { key: 0 }, [
          u("div", Xe, [
            u("div", null, [
              u("strong", null, $(m.value.title), 1),
              u("p", null, $(m.value.description), 1)
            ]),
            u("span", {
              class: "cody-approval-risk-level",
              "data-level": m.value.level
            }, $(m.value.level), 9, Ye)
          ]),
          u("code", Ze, $(m.value.subject), 1),
          m.value.riskLabels.length ? (l(), i("ul", Je, [
            (l(!0), i(R, null, z(m.value.riskLabels, (e) => (l(), i("li", { key: e }, $(e), 1))), 128))
          ])) : T("", !0),
          m.value.impacts.length ? (l(), i("details", et, [
            A[3] || (A[3] = u("summary", null, "查看影响", -1)),
            u("ul", null, [
              (l(!0), i(R, null, z(m.value.impacts, (e) => (l(), i("li", { key: e }, $(e), 1))), 128))
            ])
          ])) : T("", !0),
          u("p", tt, $(m.value.recommendation), 1)
        ], 64)) : (l(), i("p", ot, $(S.value), 1)),
        t.request.kind === "approval" ? (l(), i("div", st, [
          u("button", {
            type: "button",
            onClick: A[0] || (A[0] = (e) => r("resolveApproval", t.request.id, "accept"))
          }, "允许一次"),
          u("button", {
            type: "button",
            "data-tone": "danger",
            onClick: A[1] || (A[1] = (e) => r("resolveApproval", t.request.id, "decline"))
          }, "拒绝")
        ])) : T("", !0)
      ], 64))
    ], 8, Fe));
  }
}), at = ["data-variant"], lt = {
  key: 0,
  class: "cody-conversation-loading",
  role: "status"
}, it = {
  key: 1,
  class: "cody-conversation-empty"
}, rt = {
  key: 0,
  class: "cody-worked-divider"
}, dt = ["data-role"], ct = ["data-role"], ut = { class: "cody-message-stack" }, mt = { class: "cody-message-label" }, pt = {
  key: 0,
  class: "cody-message-skills"
}, ft = {
  key: 1,
  class: "cody-message-body"
}, gt = {
  key: 2,
  class: "cody-message-images"
}, vt = ["src"], kt = ["onClick"], yt = ["data-tone", "open"], bt = { key: 0 }, ht = ["onClick"], $t = {
  key: 3,
  class: "cody-reasoning-card"
}, wt = {
  key: 4,
  class: "cody-plan-card",
  open: ""
}, Ct = {
  key: 6,
  class: "cody-failure-card"
}, St = {
  key: 7,
  class: "cody-interrupted-card",
  role: "status"
}, xt = ["data-tone"], Kt = /* @__PURE__ */ W({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "resolveApproval", "resolveQuestion"],
  setup(t, { emit: n }) {
    const o = n, r = N({});
    function d(m) {
      r.value = {
        ...r.value,
        [m]: r.value[m] !== !0
      };
    }
    function f(m, g) {
      o("resolveApproval", m, g);
    }
    function S(m, g) {
      o("resolveQuestion", m, g);
    }
    return (m, g) => (l(), i("section", {
      class: "cody-conversation",
      "data-variant": t.variant,
      "data-cody-component": "conversation-surface"
    }, [
      t.loading ? (l(), i("div", lt, "正在同步对话…")) : t.entries.length === 0 ? (l(), i("div", it, [
        H(m.$slots, "empty", {}, () => [
          g[2] || (g[2] = J("开始这个需求的开发", -1))
        ])
      ])) : (l(!0), i(R, { key: 2 }, z(t.entries, (s) => {
        var x, A;
        return l(), i(R, {
          key: s.id
        }, [
          s.kind === "worked" ? (l(), i("div", rt, [
            u("span", null, $(s.label), 1)
          ])) : s.kind === "message" ? (l(), i("article", {
            key: 1,
            class: "cody-message",
            "data-role": s.message.role
          }, [
            u("div", {
              class: "cody-message-identity",
              "data-role": s.message.role
            }, $(s.message.role === "user" ? "你" : "CW"), 9, ct),
            u("div", ut, [
              u("div", mt, $(s.message.role === "user" ? "你" : s.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (x = s.message.skills) != null && x.length ? (l(), i("ul", pt, [
                (l(!0), i(R, null, z(s.message.skills, (e) => (l(), i("li", {
                  key: `${e.name}:${e.path}`
                }, "$" + $(e.displayName || e.name), 1))), 128))
              ])) : T("", !0),
              s.message.text ? (l(), i("div", ft, [
                H(m.$slots, "markdown", {
                  message: s.message
                }, () => [
                  V(ce, {
                    text: s.message.text,
                    onOpenFile: g[0] || (g[0] = (e) => o("openFile", e))
                  }, null, 8, ["text"])
                ])
              ])) : T("", !0),
              (A = s.message.images) != null && A.length ? (l(), i("div", gt, [
                (l(!0), i(R, null, z(s.message.images, (e) => (l(), i("img", {
                  key: e,
                  src: e,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, vt))), 128))
              ])) : T("", !0),
              s.message.text ? (l(), i("button", {
                key: 3,
                class: "cody-copy-button",
                type: "button",
                onClick: (e) => o("copy", s.message.text)
              }, "复制", 8, kt)) : T("", !0)
            ])
          ], 8, dt)) : s.kind === "tool" ? (l(), i("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": _(ae)(s.tool.status),
            open: _(ae)(s.tool.status) === "working"
          }, [
            u("summary", null, [
              g[3] || (g[3] = u("span", null, "⌁", -1)),
              u("strong", null, $(s.tool.title), 1),
              u("small", null, $(s.tool.status), 1)
            ]),
            u("p", null, $(s.tool.summary), 1),
            s.tool.details.length ? (l(), i("ul", bt, [
              (l(!0), i(R, null, z(s.tool.details, (e) => (l(), i("li", { key: e }, $(e), 1))), 128))
            ])) : T("", !0),
            s.tool.output ? (l(), i(R, { key: 1 }, [
              u("pre", null, $(r.value[s.id] ? s.tool.output : _(Me)(s.tool.output)), 1),
              _(Te)(s.tool.output) ? (l(), i("button", {
                key: 0,
                class: "cody-tool-output-toggle",
                type: "button",
                onClick: (e) => d(s.id)
              }, $(_(Re)(r.value[s.id] === !0)), 9, ht)) : T("", !0)
            ], 64)) : T("", !0)
          ], 8, yt)) : s.kind === "reasoning" ? (l(), i("details", $t, [
            u("summary", null, "✦ " + $(s.title || "推理过程"), 1),
            u("pre", null, $(s.text), 1)
          ])) : s.kind === "plan" ? (l(), i("details", wt, [
            g[4] || (g[4] = u("summary", null, "计划", -1)),
            V(ce, {
              text: s.text,
              onOpenFile: g[1] || (g[1] = (e) => o("openFile", e))
            }, null, 8, ["text"])
          ])) : s.kind === "request" ? H(m.$slots, "request", {
            request: s.request
          }, () => [
            V(nt, {
              request: s.request,
              onResolveApproval: f,
              onResolveQuestion: S
            }, null, 8, ["request"])
          ], void 0, 5) : s.kind === "failure" ? (l(), i("details", Ct, [
            g[5] || (g[5] = u("summary", null, "本次回复失败", -1)),
            u("p", null, $(s.text), 1)
          ])) : s.kind === "interrupted" ? (l(), i("article", St, $(s.text), 1)) : s.kind === "activity" ? (l(), i("article", {
            key: 8,
            class: "cody-conversation-activity",
            "data-tone": s.tone,
            role: "status",
            "aria-live": "polite"
          }, [
            g[6] || (g[6] = u("span", {
              class: "cody-activity-pulse",
              "aria-hidden": "true"
            }, null, -1)),
            u("strong", null, $(s.title), 1),
            u("small", null, $(s.detail), 1)
          ], 8, xt)) : T("", !0)
        ], 64);
      }), 128))
    ], 8, at));
  }
}), At = ["data-variant"], qt = { class: "cody-composer-shell" }, Lt = {
  key: 0,
  class: "cody-composer-selected",
  "aria-label": "Selected skills"
}, Mt = ["disabled", "aria-label", "onClick"], Tt = ["value", "disabled", "placeholder", "onKeydown"], Rt = { class: "cody-composer-controls" }, It = {
  key: 0,
  class: "cody-composer-compact-control cody-composer-skill-control",
  title: "为本轮显式选择 Skill"
}, Dt = ["disabled"], Ot = ["value"], _t = { class: "cody-composer-actions" }, jt = ["disabled"], zt = ["disabled", "aria-label"], Bt = {
  key: 1,
  class: "cody-composer-policy"
}, Xt = /* @__PURE__ */ W({
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
  setup(t, { emit: n }) {
    const o = W({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(a, { emit: c }) {
        return () => Y("label", { class: "cody-composer-compact-control", title: a.label }, [
          Y("select", { value: a.modelValue, disabled: a.disabled, "aria-label": a.label, onChange: (k) => c("update:modelValue", k.target.value) }, a.options.map((k) => Y("option", { value: k.value }, k.label)))
        ]);
      }
    }), r = t, d = n, f = j(() => r.skills.filter((a) => !r.selectedSkills.includes(a.value))), S = j(() => {
      var a;
      return ((a = r.permissionOptions.find((c) => c.value === r.selectedPermission)) == null ? void 0 : a.description) ?? "";
    }), m = j(() => !r.disabled && je({ text: r.draft, skills: r.selectedSkills })), g = j(() => r.isRunning && r.selectedSubmitMode === "steer" ? "发送引导" : r.isRunning ? "加入队列" : "发送");
    function s(a, c) {
      var k;
      return ((k = a.find((E) => E.value === c)) == null ? void 0 : k.label) ?? c;
    }
    function x(a) {
      a && !r.selectedSkills.includes(a) && d("update:selected-skills", [...r.selectedSkills, a]);
    }
    function A(a) {
      d("update:selected-skills", r.selectedSkills.filter((c) => c !== a));
    }
    function e() {
      m.value && d("send");
    }
    return (a, c) => (l(), i("form", {
      class: "cody-composer",
      "data-variant": t.variant,
      "data-cody-component": "composer-surface",
      onSubmit: se(e, ["prevent"])
    }, [
      u("div", qt, [
        t.selectedSkills.length ? (l(), i("div", Lt, [
          (l(!0), i(R, null, z(t.selectedSkills, (k) => (l(), i("span", {
            key: k,
            class: "cody-composer-chip"
          }, [
            J(" $" + $(s(t.skills, k)) + " ", 1),
            u("button", {
              type: "button",
              disabled: t.disabled,
              "aria-label": `移除 Skill ${s(t.skills, k)}`,
              onClick: (E) => A(k)
            }, "×", 8, Mt)
          ]))), 128))
        ])) : T("", !0),
        u("textarea", {
          value: t.draft,
          rows: "1",
          disabled: t.disabled,
          placeholder: t.placeholder,
          onInput: c[0] || (c[0] = (k) => d("update:draft", k.target.value)),
          onKeydown: me(se(e, ["exact", "prevent"]), ["enter"])
        }, null, 40, Tt),
        u("div", Rt, [
          H(a.$slots, "leading"),
          t.skills.length ? (l(), i("label", It, [
            c[9] || (c[9] = u("span", {
              class: "cody-composer-icon",
              "aria-hidden": "true"
            }, "✦", -1)),
            u("select", {
              value: "",
              disabled: t.disabled,
              "aria-label": "添加 Skill",
              onChange: c[1] || (c[1] = (k) => x(k.target.value))
            }, [
              c[8] || (c[8] = u("option", { value: "" }, "Skills", -1)),
              (l(!0), i(R, null, z(f.value, (k) => (l(), i("option", {
                key: k.value,
                value: k.value
              }, "$" + $(k.label), 9, Ot))), 128))
            ], 40, Dt)
          ])) : T("", !0),
          t.collaborationModes.length ? (l(), ne(_(o), {
            key: 1,
            label: "协作模式",
            "model-value": t.selectedCollaborationMode,
            options: t.collaborationModes,
            disabled: t.disabled || t.isRunning,
            "onUpdate:modelValue": c[2] || (c[2] = (k) => d("update:collaboration-mode", k))
          }, null, 8, ["model-value", "options", "disabled"])) : T("", !0),
          V(_(o), {
            label: "提交策略",
            "model-value": t.selectedSubmitMode,
            options: t.submitModes,
            disabled: t.disabled,
            "onUpdate:modelValue": c[3] || (c[3] = (k) => d("update:submit-mode", k))
          }, null, 8, ["model-value", "options", "disabled"]),
          t.models.length ? (l(), ne(_(o), {
            key: 2,
            label: "模型",
            "model-value": t.selectedModel,
            options: t.models,
            disabled: t.disabled || t.isRunning,
            "onUpdate:modelValue": c[4] || (c[4] = (k) => d("update:model", k))
          }, null, 8, ["model-value", "options", "disabled"])) : T("", !0),
          V(_(o), {
            label: "推理强度",
            "model-value": t.selectedReasoning,
            options: t.reasoningOptions,
            disabled: t.disabled || t.isRunning,
            "onUpdate:modelValue": c[5] || (c[5] = (k) => d("update:reasoning", k))
          }, null, 8, ["model-value", "options", "disabled"]),
          V(_(o), {
            label: "权限",
            "model-value": t.selectedPermission,
            options: t.permissionOptions,
            disabled: t.disabled || t.isRunning,
            "onUpdate:modelValue": c[6] || (c[6] = (k) => d("update:permission", k))
          }, null, 8, ["model-value", "options", "disabled"]),
          H(a.$slots, "controls"),
          u("div", _t, [
            t.isRunning ? (l(), i("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: t.disabled,
              onClick: c[7] || (c[7] = (k) => d("stop"))
            }, "停止", 8, jt)) : T("", !0),
            u("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: !m.value,
              "aria-label": g.value
            }, "↑", 8, zt)
          ])
        ]),
        S.value ? (l(), i("p", Bt, $(S.value), 1)) : T("", !0)
      ])
    ], 40, At));
  }
});
function Yt() {
  const t = xe(Z());
  let n = null, o = null, r = 0;
  const d = () => {
    r += 1, o == null || o(), o = null, n == null || n.dispose(), n = null;
  }, f = async (s, x) => {
    d(), t.value = Z(s);
    const A = r, e = ze(s, x);
    n = e, o = e.subscribe((a) => {
      n === e && r === A && (t.value = a);
    }), await e.start();
  }, S = async () => {
    await (n == null ? void 0 : n.refresh());
  }, m = (s = "") => {
    d(), t.value = Z(s);
  }, g = () => {
    d();
  };
  return Ae() && qe(g), {
    state: j(() => t.value),
    connect: f,
    refresh: S,
    reset: m,
    dispose: g
  };
}
export {
  Xt as CodyComposer,
  Kt as CodyConversation,
  ce as CodyMarkdown,
  nt as CodyRequestCard,
  G as DEFAULT_CODY_MARKDOWN_LABELS,
  Qt as conversationEntriesFromState,
  ge as questionFieldsFromParams,
  re as renderCodyMarkdown,
  Ee as requestSummary,
  de as stabilizeStreamingMarkdown,
  Yt as useConversationController
};
