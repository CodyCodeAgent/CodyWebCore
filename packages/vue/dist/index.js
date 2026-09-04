import { defineComponent as ee, computed as O, ref as F, watch as de, onMounted as Se, onBeforeUnmount as xe, openBlock as i, createElementBlock as d, Fragment as U, createElementVNode as c, nextTick as he, reactive as Ae, toDisplayString as $, renderList as P, createCommentVNode as M, createTextVNode as ce, normalizeClass as ue, withDirectives as qe, withKeys as Me, vModelDynamic as Le, renderSlot as J, createVNode as Q, unref as V, h as ie, useId as De, withModifiers as me, createBlock as pe, shallowRef as Te, getCurrentScope as Ee, onScopeDispose as Ue } from "vue";
import { buildApprovalRiskSummary as Re, toolStatusTone as ge, buildToolOutputPreview as Ie, isToolOutputTruncated as Oe, toolOutputToggleLabel as _e } from "@codycodeagent/cody-web-core/presentation";
import $e from "dompurify";
import Be from "markdown-it";
import Fe from "markdown-it-footnote";
import Pe from "markdown-it-task-lists";
import { conversationFeedFromState as je, formatTurnDuration as ze, createConversationState as re } from "@codycodeagent/cody-web-core/conversation";
import { composerHasContent as Ve, removeComposerTrigger as Ne, findComposerTrigger as He } from "@codycodeagent/cody-web-core/composer";
import { createConversationController as We } from "@codycodeagent/cody-web-core/client";
const te = {
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
}, R = new Be({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
R.use(Pe, { enabled: !1, label: !0, labelAfter: !0 });
R.use(Fe);
function B(e, n) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${e}" aria-label="${n}" title="${n}">${n}</button>`;
}
function we(e, n = "", l = te) {
  const r = n.toLowerCase();
  if (r === "mermaid" || r === "plantuml" || r === "puml") {
    const E = r === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${E}"><header class="markdown-diagram-toolbar"><span>${E}</span><span class="markdown-diagram-actions">${B("diagram-zoom-out", l.zoomOut)}${B("diagram-fit", l.fit)}${B("diagram-zoom-in", l.zoomIn)}${B("diagram-source", l.source)}${B("diagram-fullscreen", l.fullscreen)}${B("diagram-export-svg", "SVG")}${B("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${l.diagramAria(E)}"><p class="markdown-diagram-status">${l.rendering(E)}</p></div><pre class="markdown-diagram-source" hidden><code>${R.utils.escapeHtml(e)}</code></pre></div>
`;
  }
  const t = e.replace(/\n$/u, "").split(`
`), u = t.length <= 2 && t.every((E) => E.length <= 96), C = t.length > 10, g = n || "text", f = [u ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(n) ? `language-${n}` : ""].filter(Boolean).join(" "), o = f ? ` class="${f}"` : "", A = [u ? "is-compact" : "", C ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), T = C ? `${g} · ${l.lineCount(t.length)}` : g, m = C ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${l.collapseCode}" title="${l.collapseCode}" aria-expanded="false">${l.collapseCode}</button>` : "", S = C ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${l.expandCode(t.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${A ? ` ${A}` : ""}" data-language="${g}" data-code-lines="${String(t.length)}"><header class="markdown-code-toolbar"><span>${T}</span><span class="markdown-code-actions">${m}${B("wrap-code", l.wrap)}${B("copy-code", l.copy)}${B("save-code", l.save)}</span></header><pre class="markdown-code-block${u ? " is-compact" : ""}"><code${o}>${R.utils.escapeHtml(e)}</code></pre>${S}</div></div>
`;
}
R.renderer.rules.fence = (e, n, l, r) => {
  const t = e[n];
  return we(t.content, t.info.trim().split(/\s+/u)[0] ?? "", r.labels);
};
R.renderer.rules.code_block = (e, n, l, r) => we(e[n].content, "", r.labels);
R.renderer.rules.table_open = (e, n, l, r) => {
  const t = r.labels ?? te;
  return `<section class="markdown-table-shell" role="region" aria-label="${t.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${B("copy-table", t.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
R.renderer.rules.table_close = () => `</table></div></section>
`;
const fe = R.renderer.rules.code_inline;
R.renderer.rules.code_inline = (e, n, l, r, t) => {
  const u = e[n].content, C = u.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!C || /\s/u.test(u)) return fe ? fe(e, n, l, r, t) : t.renderToken(e, n, l);
  const g = R.utils.escapeHtml(C[1]), f = C[2] ?? "", o = r.labels ?? te;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${g}" data-file-line="${f}" title="${o.openFile(g)}"><code>${R.utils.escapeHtml(u)}</code></button>`;
};
const ve = R.renderer.rules.link_open;
R.renderer.rules.link_open = (e, n, l, r, t) => {
  const u = e[n];
  return /^https?:\/\//u.test(u.attrGet("href") ?? "") && (u.attrSet("target", "_blank"), u.attrSet("rel", "noopener noreferrer")), ve ? ve(e, n, l, r, t) : t.renderToken(e, n, l);
};
function ye(e, n = te) {
  return $e.sanitize(R.render(e, { labels: n }), {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"]
  });
}
function ke(e) {
  var n;
  return (((n = e.match(/^\s*```/gmu)) == null ? void 0 : n.length) ?? 0) % 2 === 1 ? `${e}

\`\`\`` : e;
}
const Ke = ["innerHTML"], Ge = ["src"], be = /* @__PURE__ */ ee({
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
  setup(e, { emit: n }) {
    const l = e, r = n, t = O(() => l.labels ?? te), u = F(null), C = F(null), g = F(ye(ke(l.text), t.value)), f = F(""), o = /* @__PURE__ */ new Set();
    let A = 0, T = 0;
    const m = {
      javascript: () => import("highlight.js/lib/languages/javascript"),
      typescript: () => import("highlight.js/lib/languages/typescript"),
      python: () => import("highlight.js/lib/languages/python"),
      go: () => import("highlight.js/lib/languages/go"),
      rust: () => import("highlight.js/lib/languages/rust"),
      json: () => import("highlight.js/lib/languages/json"),
      bash: () => import("highlight.js/lib/languages/bash"),
      sql: () => import("highlight.js/lib/languages/sql")
    };
    async function S(p) {
      window.clearTimeout(A), A = window.setTimeout(async () => {
        g.value = ye(ke(p), t.value), await he(), E();
      }, l.renderDelay);
    }
    async function E() {
      var b, y, k, x, h, j;
      for (const q of Array.from(((b = u.value) == null ? void 0 : b.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((y = q.textContent) == null ? void 0 : y.trim()) ?? "") && (q.dataset.numeric = "true");
      for (const q of Array.from(((k = u.value) == null ? void 0 : k.querySelectorAll("img")) ?? []))
        q.addEventListener("error", () => {
          q.alt = q.alt || "图片加载失败", q.classList.add("is-load-error");
        }, { once: !0 });
      X();
      for (const [q, L] of Array.from(((x = u.value) == null ? void 0 : x.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        L.dataset.codeIndex = String(q), L.classList.contains("is-collapsible") && o.has(q) && L.classList.remove("is-collapsed");
        for (const D of Array.from(L.querySelectorAll('[data-markdown-action="toggle-code"]')))
          D.setAttribute("aria-expanded", String(!L.classList.contains("is-collapsed")));
        const I = L.querySelector("pre"), _ = L.querySelector('[data-markdown-action="wrap-code"]');
        I && _ && (_.hidden = I.scrollWidth <= I.clientWidth + 2, _.setAttribute("aria-pressed", String(L.classList.contains("is-wrapped"))));
      }
      await N();
      const p = Array.from(((h = u.value) == null ? void 0 : h.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (p.length === 0) return;
      const w = (await import("highlight.js/lib/core")).default;
      for (const q of p) {
        const L = ((j = Array.from(q.classList).find((D) => D.startsWith("language-"))) == null ? void 0 : j.slice(9)) ?? "", I = m[L];
        if (!I || q.dataset.highlighted === "yes") continue;
        const _ = await I();
        w.getLanguage(L) || w.registerLanguage(L, _.default), q.innerHTML = w.highlight(q.textContent ?? "", { language: L }).value, q.dataset.highlighted = "yes";
      }
    }
    function X() {
      var w;
      if (!l.resolveAssetUrl) return;
      const p = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const b of Array.from(((w = u.value) == null ? void 0 : w.querySelectorAll("a[href]")) ?? [])) {
        const y = b.getAttribute("href") ?? "";
        if (!p.test(y) || /^(?:data|blob):/iu.test(y)) continue;
        const k = l.resolveAssetUrl(y);
        k && (b.href = k, b.target = "_blank", b.rel = "noopener noreferrer");
      }
    }
    async function N() {
      var w, b, y, k;
      const p = Array.from(((w = u.value) == null ? void 0 : w.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const x of p) {
        x.dataset.rendered = "loading";
        const h = x.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", j = ((b = x.querySelector("code")) == null ? void 0 : b.textContent) ?? "", q = x.querySelector(".markdown-diagram-stage");
        if (q)
          try {
            let L = await ((y = l.renderDiagram) == null ? void 0 : y.call(l, { engine: h, source: j, dark: l.dark }));
            if (!L && h === "mermaid") {
              const { default: I } = await import("mermaid");
              I.initialize({ startOnLoad: !1, securityLevel: "strict", theme: l.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), L = (await I.render(`cody-diagram-${String(++T)}`, j)).svg;
            }
            if (!L) throw new Error(h === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            q.innerHTML = W(L), oe(q), x.dataset.rendered = "yes", x.style.setProperty("--diagram-scale", "1");
          } catch (L) {
            q.textContent = L instanceof Error ? L.message : "图表渲染失败", q.classList.add("markdown-diagram-error"), (k = x.querySelector(".markdown-diagram-source")) == null || k.removeAttribute("hidden"), x.dataset.rendered = "error";
          }
      }
    }
    function W(p) {
      const w = $e.sanitize(p, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), b = w.trimStart().startsWith("<svg") ? w : `<svg xmlns="http://www.w3.org/2000/svg">${w}</svg>`, y = new DOMParser().parseFromString(b, "image/svg+xml");
      if (y.querySelector("parsererror")) return "";
      for (const k of y.querySelectorAll("*")) for (const x of Array.from(k.attributes)) /^on/iu.test(x.name) && k.removeAttribute(x.name);
      return y.querySelectorAll("script").forEach((k) => k.remove()), new XMLSerializer().serializeToString(y.documentElement);
    }
    function oe(p) {
      if (p.dataset.panReady === "true") return;
      p.dataset.panReady = "true";
      let w = 0, b = 0, y = 0, k = 0;
      p.addEventListener("pointerdown", (h) => {
        h.button === 0 && (w = h.clientX, b = h.clientY, y = p.scrollLeft, k = p.scrollTop, p.setPointerCapture(h.pointerId), p.classList.add("is-panning"));
      }), p.addEventListener("pointermove", (h) => {
        p.hasPointerCapture(h.pointerId) && (p.scrollLeft = y - (h.clientX - w), p.scrollTop = k - (h.clientY - b));
      });
      const x = (h) => {
        p.hasPointerCapture(h.pointerId) && p.releasePointerCapture(h.pointerId), p.classList.remove("is-panning");
      };
      p.addEventListener("pointerup", x), p.addEventListener("pointercancel", x);
    }
    function Y(p, w = 0) {
      const b = Number(p.style.getPropertyValue("--diagram-scale") || "1");
      p.style.setProperty("--diagram-scale", String(w === 0 ? 1 : Math.min(2.5, Math.max(0.4, b + w))));
    }
    function Z(p, w) {
      const b = document.createElement("a");
      b.href = URL.createObjectURL(p), b.download = w, b.click(), URL.revokeObjectURL(b.href);
    }
    async function ae(p, w) {
      const b = w.textContent;
      try {
        await navigator.clipboard.writeText(p), w.textContent = "已复制";
      } catch {
        const y = document.createElement("textarea");
        y.value = p, y.style.position = "fixed", y.style.opacity = "0", document.body.appendChild(y), y.select();
        const k = document.execCommand("copy");
        y.remove(), w.textContent = k ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        w.textContent = b;
      }, 1200);
    }
    function se(p) {
      return Array.from((p == null ? void 0 : p.rows) ?? []).map((w) => Array.from(w.cells).map((b) => {
        var y;
        return `"${((y = b.textContent) == null ? void 0 : y.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function ne(p) {
      var j, q, L, I, _;
      const w = p.target, b = w.closest("img");
      if (b) {
        f.value = b.currentSrc || b.src, (j = C.value) == null || j.showModal();
        return;
      }
      const y = w.closest("[data-markdown-action]");
      if (!y) return;
      const k = y.closest(".markdown-code-shell, .markdown-table-shell"), x = y.dataset.markdownAction;
      if (x === "copy-code" && ae(((q = k == null ? void 0 : k.querySelector("code")) == null ? void 0 : q.textContent) ?? "", y), x === "wrap-code") {
        const D = (k == null ? void 0 : k.classList.toggle("is-wrapped")) ?? !1;
        y.textContent = D && t.value.scroll || t.value.wrap, y.setAttribute("aria-pressed", String(D));
      }
      if (x === "save-code" && Z(new Blob([((L = k == null ? void 0 : k.querySelector("code")) == null ? void 0 : L.textContent) ?? ""], { type: "text/plain" }), `snippet.${(k == null ? void 0 : k.dataset.language) || "txt"}`), x === "toggle-code" && (k != null && k.classList.contains("is-collapsible"))) {
        const D = Number(k.dataset.codeIndex ?? -1), H = !k.classList.toggle("is-collapsed");
        D >= 0 && (H ? o.add(D) : o.delete(D));
        for (const a of Array.from(k.querySelectorAll('[data-markdown-action="toggle-code"]'))) a.setAttribute("aria-expanded", String(H));
      }
      if (x === "copy-table" && ae(se((k == null ? void 0 : k.querySelector("table")) ?? null), y), x === "open-file") {
        const D = y.dataset.filePath ?? "", H = ((I = l.cwd) == null ? void 0 : I.replace(/\/$/u, "")) ?? "", a = D.startsWith("/") && H && D.startsWith(`${H}/`) ? D.slice(H.length + 1) : D.replace(/^\.\//u, "");
        r("openFile", { path: a, line: Number(y.dataset.fileLine || 0) || 1 });
      }
      const h = y.closest(".markdown-diagram-shell");
      if (h && x === "diagram-zoom-in" && Y(h, 0.2), h && x === "diagram-zoom-out" && Y(h, -0.2), h && x === "diagram-fit" && Y(h), h && x === "diagram-source") {
        const D = h.querySelector(".markdown-diagram-source");
        D && (D.hidden = !D.hidden);
      }
      if (h && x === "diagram-fullscreen" && ((_ = h.requestFullscreen) == null || _.call(h)), h && x === "diagram-export-svg") {
        const D = h.querySelector("svg");
        D && Z(new Blob([new XMLSerializer().serializeToString(D)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    function le() {
      var p;
      (p = C.value) == null || p.close();
    }
    return de(() => [l.text, l.labels], ([p]) => {
      S(p);
    }, { deep: !0 }), Se(() => {
      E();
    }), xe(() => window.clearTimeout(A)), (p, w) => (i(), d(U, null, [
      c("div", {
        ref_key: "rootRef",
        ref: u,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: g.value,
        onClick: ne
      }, null, 8, Ke),
      c("dialog", {
        ref_key: "imageDialogRef",
        ref: C,
        class: "cody-markdown-image-dialog",
        onClick: le
      }, [
        c("button", {
          type: "button",
          "aria-label": "关闭图片预览",
          onClick: le
        }, "×"),
        c("img", {
          src: f.value,
          alt: "Markdown 图片预览"
        }, null, 8, Ge)
      ], 512)
    ], 64));
  }
});
function Ce(e) {
  if (!e || typeof e != "object") return [];
  const n = e;
  return (Array.isArray(n.questions) ? n.questions : []).flatMap((r, t) => {
    if (!r || typeof r != "object") return [];
    const u = r, C = typeof u.question == "string" ? u.question.trim() : "";
    if (!C) return [];
    const g = Array.isArray(u.options) ? u.options : [];
    return [{
      id: typeof u.id == "string" && u.id.trim() ? u.id.trim() : `question-${String(t + 1)}`,
      header: typeof u.header == "string" ? u.header.trim() : "",
      question: C,
      isOther: u.isOther === !0,
      isSecret: u.isSecret === !0,
      options: g.flatMap((f) => {
        if (!f || typeof f != "object") return [];
        const o = f, A = typeof o.label == "string" ? o.label.trim() : "";
        return A ? [{ label: A, description: typeof o.description == "string" ? o.description.trim() : "" }] : [];
      })
    }];
  });
}
function Qe(e) {
  var r;
  if (!e || typeof e != "object") return "Codex 请求执行一项受保护操作。";
  const n = e, l = n.reason ?? n.question ?? n.command;
  return typeof l == "string" && l.trim() ? l : ((r = Ce(e)[0]) == null ? void 0 : r.question) ?? "Codex 请求执行一项受保护操作。";
}
function po(e) {
  var r;
  const n = [], l = (t) => {
    if (t.kind === "reasoning") {
      n.push({ id: t.id, kind: "reasoning", text: t.text });
      return;
    }
    if (!t.tool.summary && t.tool.details.length === 0 && !t.tool.output && t.tool.kind !== "fileChange") return;
    if (t.tool.kind !== "fileChange") {
      n.push({ id: t.id, kind: "tool", tool: t.tool });
      return;
    }
    const u = `file-group:${t.turnId ?? t.id}`, C = n.at(-1);
    if (!C || C.kind !== "tool" || C.id !== u) {
      const o = [...new Set(t.tool.details)], A = {
        id: u,
        kind: "tool",
        tool: {
          ...t.tool,
          title: o.length > 1 ? `文件变更 · ${String(o.length)} 个文件` : "文件变更",
          summary: o.length ? `${String(o.length)} 个文件已更新` : t.tool.summary,
          details: o
        }
      };
      n.push(A);
      return;
    }
    const g = [.../* @__PURE__ */ new Set([...C.tool.details, ...t.tool.details])], f = [C.tool.output, t.tool.output].filter(Boolean).join(`

`);
    C.tool = {
      ...C.tool,
      status: /fail|error|cancel|reject/iu.test(`${C.tool.status} ${t.tool.status}`) ? "failed" : t.tool.status,
      title: g.length > 1 ? `文件变更 · ${String(g.length)} 个文件` : "文件变更",
      summary: g.length ? `${String(g.length)} 个文件已更新` : t.tool.summary,
      details: g,
      ...f ? { output: f } : {}
    };
  };
  for (const t of je(e))
    if (t.kind === "message") n.push({ id: t.id, kind: "message", message: t.message });
    else if (t.kind === "timeline") l(t.entry);
    else if (t.kind === "plan") n.push({ id: t.id, kind: "plan", text: t.plan.text });
    else if (t.kind === "request") n.push({ id: t.id, kind: "request", request: t.request });
    else if (t.kind === "turn" && t.status === "failed") n.push({ id: t.id, kind: "failure", text: t.error });
    else {
      if (t.kind === "turn" && t.status === "interrupted") continue;
      t.kind === "turn" && t.status === "completed" ? n.push({ id: t.id, kind: "worked", label: `Worked for ${ze(t.durationMs ?? 0)}` }) : t.kind === "activity" && n.push({
        id: t.id,
        kind: "activity",
        title: t.status === "waiting" ? ((r = e.pendingRequests.find((u) => !u.turnId || u.turnId === t.turnId)) == null ? void 0 : r.kind) === "approval" ? "等待你的审批" : "等待你的回答" : t.label,
        detail: t.status === "waiting" ? "处理后 Codex 会继续本次回复" : t.status === "retrying" ? e.connection.status === "disconnected" ? "连接已中断，等待恢复" : "正在恢复本次回复" : e.connection.status === "connected" ? "实时更新中" : "等待恢复连接",
        tone: t.status
      });
    }
  return n;
}
const Xe = ["data-kind"], Ye = { class: "cody-request-heading" }, Ze = { key: 0 }, Je = {
  key: 0,
  class: "cody-question-options"
}, et = ["onClick"], tt = { key: 0 }, ot = ["onUpdate:modelValue", "type", "placeholder"], at = { class: "cody-request-actions" }, st = ["disabled"], nt = { class: "cody-approval-risk-heading" }, lt = ["data-level"], it = { class: "cody-approval-risk-subject" }, rt = {
  key: 0,
  class: "cody-approval-risk-labels"
}, dt = {
  key: 1,
  class: "cody-approval-risk-details"
}, ct = { class: "cody-approval-risk-recommendation" }, ut = { key: 1 }, mt = {
  key: 2,
  class: "cody-request-actions"
}, pt = /* @__PURE__ */ ee({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(e, { emit: n }) {
    const l = e, r = n, t = Ae({}), u = O(() => Ce(l.request.params)), C = O(() => Qe(l.request.params)), g = O(() => l.request.kind === "approval" ? Re({ method: l.request.method, params: l.request.params }) : null), f = O(() => u.value.length > 0 && u.value.every((A) => {
      var T;
      return !!((T = t[A.id]) != null && T.trim());
    }));
    de(() => l.request.id, () => {
      for (const A of Object.keys(t)) delete t[A];
    });
    function o() {
      f.value && r("resolveQuestion", l.request.id, Object.fromEntries(u.value.map((A) => [A.id, { answers: [t[A.id].trim()] }])));
    }
    return (A, T) => (i(), d("article", {
      class: "cody-request-card",
      "data-kind": e.request.kind
    }, [
      c("div", Ye, [
        c("strong", null, $(e.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        T[2] || (T[2] = c("small", null, "Agent 已暂停等待", -1))
      ]),
      e.request.kind === "question" && u.value.length ? (i(), d(U, { key: 0 }, [
        (i(!0), d(U, null, P(u.value, (m) => (i(), d("fieldset", {
          key: m.id,
          class: "cody-question-field"
        }, [
          c("legend", null, [
            m.header ? (i(), d("span", Ze, $(m.header), 1)) : M("", !0),
            ce($(m.question), 1)
          ]),
          m.options.length ? (i(), d("div", Je, [
            (i(!0), d(U, null, P(m.options, (S) => (i(), d("button", {
              key: S.label,
              type: "button",
              class: ue({ selected: t[m.id] === S.label }),
              onClick: (E) => t[m.id] = S.label
            }, [
              c("strong", null, $(S.label), 1),
              S.description ? (i(), d("small", tt, $(S.description), 1)) : M("", !0)
            ], 10, et))), 128))
          ])) : M("", !0),
          m.options.length === 0 || m.isOther ? qe((i(), d("input", {
            key: 1,
            "onUpdate:modelValue": (S) => t[m.id] = S,
            type: m.isSecret ? "password" : "text",
            placeholder: m.options.length ? "其他回答…" : "输入回答…",
            onKeyup: Me(o, ["enter"])
          }, null, 40, ot)), [
            [Le, t[m.id]]
          ]) : M("", !0)
        ]))), 128)),
        c("div", at, [
          c("button", {
            type: "button",
            disabled: !f.value,
            onClick: o
          }, "提交回答", 8, st)
        ])
      ], 64)) : (i(), d(U, { key: 1 }, [
        g.value ? (i(), d(U, { key: 0 }, [
          c("div", nt, [
            c("div", null, [
              c("strong", null, $(g.value.title), 1),
              c("p", null, $(g.value.description), 1)
            ]),
            c("span", {
              class: "cody-approval-risk-level",
              "data-level": g.value.level
            }, $(g.value.level), 9, lt)
          ]),
          c("code", it, $(g.value.subject), 1),
          g.value.riskLabels.length ? (i(), d("ul", rt, [
            (i(!0), d(U, null, P(g.value.riskLabels, (m) => (i(), d("li", { key: m }, $(m), 1))), 128))
          ])) : M("", !0),
          g.value.impacts.length ? (i(), d("details", dt, [
            T[3] || (T[3] = c("summary", null, "查看影响", -1)),
            c("ul", null, [
              (i(!0), d(U, null, P(g.value.impacts, (m) => (i(), d("li", { key: m }, $(m), 1))), 128))
            ])
          ])) : M("", !0),
          c("p", ct, $(g.value.recommendation), 1)
        ], 64)) : (i(), d("p", ut, $(C.value), 1)),
        e.request.kind === "approval" ? (i(), d("div", mt, [
          c("button", {
            type: "button",
            onClick: T[0] || (T[0] = (m) => r("resolveApproval", e.request.id, "accept"))
          }, "允许一次"),
          c("button", {
            type: "button",
            "data-tone": "danger",
            onClick: T[1] || (T[1] = (m) => r("resolveApproval", e.request.id, "decline"))
          }, "拒绝")
        ])) : M("", !0)
      ], 64))
    ], 8, Xe));
  }
}), gt = ["data-variant"], ft = {
  key: 0,
  class: "cody-conversation-loading",
  role: "status"
}, vt = {
  key: 1,
  class: "cody-conversation-empty"
}, yt = {
  key: 0,
  class: "cody-worked-divider"
}, kt = ["data-role"], bt = ["data-role"], ht = { class: "cody-message-stack" }, $t = { class: "cody-message-label" }, wt = {
  key: 0,
  class: "cody-message-skills"
}, Ct = {
  key: 1,
  class: "cody-message-body"
}, St = {
  key: 2,
  class: "cody-message-images"
}, xt = ["src"], At = ["onClick"], qt = ["onClick"], Mt = ["data-tone", "open"], Lt = { key: 0 }, Dt = ["onClick"], Tt = {
  key: 3,
  class: "cody-reasoning-card"
}, Et = {
  key: 4,
  class: "cody-plan-card",
  open: ""
}, Ut = {
  key: 6,
  class: "cody-failure-card"
}, Rt = {
  key: 7,
  class: "cody-interrupted-card",
  role: "status"
}, It = ["data-tone"], go = /* @__PURE__ */ ee({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "retryMessage", "resolveApproval", "resolveQuestion"],
  setup(e, { emit: n }) {
    const l = n, r = F({});
    function t(g) {
      r.value = {
        ...r.value,
        [g]: r.value[g] !== !0
      };
    }
    function u(g, f) {
      l("resolveApproval", g, f);
    }
    function C(g, f) {
      l("resolveQuestion", g, f);
    }
    return (g, f) => (i(), d("section", {
      class: "cody-conversation",
      "data-variant": e.variant,
      "data-cody-component": "conversation-surface"
    }, [
      e.loading ? (i(), d("div", ft, "正在同步对话…")) : e.entries.length === 0 ? (i(), d("div", vt, [
        J(g.$slots, "empty", {}, () => [
          f[2] || (f[2] = ce("开始这个需求的开发", -1))
        ])
      ])) : (i(!0), d(U, { key: 2 }, P(e.entries, (o) => {
        var A, T;
        return i(), d(U, {
          key: o.id
        }, [
          o.kind === "worked" ? (i(), d("div", yt, [
            c("span", null, $(o.label), 1)
          ])) : o.kind === "message" ? (i(), d("article", {
            key: 1,
            class: "cody-message",
            "data-role": o.message.role
          }, [
            c("div", {
              class: "cody-message-identity",
              "data-role": o.message.role
            }, $(o.message.role === "user" ? "你" : "CW"), 9, bt),
            c("div", ht, [
              c("div", $t, $(o.message.role === "user" ? "你" : o.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (A = o.message.skills) != null && A.length ? (i(), d("ul", wt, [
                (i(!0), d(U, null, P(o.message.skills, (m) => (i(), d("li", {
                  key: `${m.name}:${m.path}`
                }, "$" + $(m.displayName || m.name), 1))), 128))
              ])) : M("", !0),
              o.message.text ? (i(), d("div", Ct, [
                J(g.$slots, "markdown", {
                  message: o.message
                }, () => [
                  Q(be, {
                    text: o.message.text,
                    onOpenFile: f[0] || (f[0] = (m) => l("openFile", m))
                  }, null, 8, ["text"])
                ])
              ])) : M("", !0),
              (T = o.message.images) != null && T.length ? (i(), d("div", St, [
                (i(!0), d(U, null, P(o.message.images, (m) => (i(), d("img", {
                  key: m,
                  src: m,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, xt))), 128))
              ])) : M("", !0),
              o.message.outbox ? (i(), d("div", {
                key: 3,
                class: ue(["cody-message-outbox", o.message.outbox.status]),
                role: "status"
              }, [
                c("span", null, $(o.message.outbox.status === "failed" ? `发送失败${o.message.outbox.lastError ? `：${o.message.outbox.lastError}` : ""}` : o.message.outbox.status === "queued" ? "已加入发送队列" : "正在发送…"), 1),
                o.message.outbox.status === "failed" ? (i(), d("button", {
                  key: 0,
                  class: "cody-message-retry",
                  type: "button",
                  onClick: (m) => l("retryMessage", o.message)
                }, "重试此消息", 8, At)) : M("", !0)
              ], 2)) : M("", !0),
              o.message.text ? (i(), d("button", {
                key: 4,
                class: "cody-copy-button",
                type: "button",
                onClick: (m) => l("copy", o.message.text)
              }, "复制", 8, qt)) : M("", !0)
            ])
          ], 8, kt)) : o.kind === "tool" ? (i(), d("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": V(ge)(o.tool.status),
            open: V(ge)(o.tool.status) === "working"
          }, [
            c("summary", null, [
              f[3] || (f[3] = c("span", null, "⌁", -1)),
              c("strong", null, $(o.tool.title), 1),
              c("small", null, $(o.tool.status), 1)
            ]),
            c("p", null, $(o.tool.summary), 1),
            o.tool.details.length ? (i(), d("ul", Lt, [
              (i(!0), d(U, null, P(o.tool.details, (m) => (i(), d("li", { key: m }, $(m), 1))), 128))
            ])) : M("", !0),
            o.tool.output ? (i(), d(U, { key: 1 }, [
              c("pre", null, $(r.value[o.id] ? o.tool.output : V(Ie)(o.tool.output)), 1),
              V(Oe)(o.tool.output) ? (i(), d("button", {
                key: 0,
                class: "cody-tool-output-toggle",
                type: "button",
                onClick: (m) => t(o.id)
              }, $(V(_e)(r.value[o.id] === !0)), 9, Dt)) : M("", !0)
            ], 64)) : M("", !0)
          ], 8, Mt)) : o.kind === "reasoning" ? (i(), d("details", Tt, [
            c("summary", null, "✦ " + $(o.title || "推理过程"), 1),
            c("pre", null, $(o.text), 1)
          ])) : o.kind === "plan" ? (i(), d("details", Et, [
            f[4] || (f[4] = c("summary", null, "计划", -1)),
            Q(be, {
              text: o.text,
              onOpenFile: f[1] || (f[1] = (m) => l("openFile", m))
            }, null, 8, ["text"])
          ])) : o.kind === "request" ? J(g.$slots, "request", {
            request: o.request
          }, () => [
            Q(pt, {
              request: o.request,
              onResolveApproval: u,
              onResolveQuestion: C
            }, null, 8, ["request"])
          ], void 0, 5) : o.kind === "failure" ? (i(), d("details", Ut, [
            f[5] || (f[5] = c("summary", null, "本次回复失败", -1)),
            c("p", null, $(o.text), 1)
          ])) : o.kind === "interrupted" ? (i(), d("article", Rt, $(o.text), 1)) : o.kind === "activity" ? (i(), d("article", {
            key: 8,
            class: "cody-conversation-activity",
            "data-tone": o.tone,
            role: "status",
            "aria-live": "polite"
          }, [
            f[6] || (f[6] = c("span", {
              class: "cody-activity-pulse",
              "aria-hidden": "true"
            }, null, -1)),
            c("strong", null, $(o.title), 1),
            c("small", null, $(o.detail), 1)
          ], 8, It)) : M("", !0)
        ], 64);
      }), 128))
    ], 8, gt));
  }
}), Ot = ["data-variant"], _t = ["data-image-drag-active"], Bt = {
  key: 0,
  class: "cody-composer-images",
  "aria-label": "已添加图片"
}, Ft = ["src", "alt"], Pt = ["disabled", "aria-label", "onClick"], jt = {
  key: 1,
  class: "cody-composer-selected",
  "aria-label": "已引用 Skills"
}, zt = ["disabled", "aria-label", "onClick"], Vt = ["value", "disabled", "placeholder", "aria-expanded", "aria-controls", "aria-activedescendant"], Nt = {
  key: 0,
  class: "cody-composer-skill-status"
}, Ht = ["id", "aria-selected", "onMouseenter", "onMousedown"], Wt = { class: "cody-composer-skill-option-name" }, Kt = {
  key: 0,
  class: "cody-composer-skill-option-description"
}, Gt = { class: "cody-composer-controls" }, Qt = {
  class: "cody-composer-settings",
  "aria-label": "运行设置"
}, Xt = ["disabled"], Yt = { class: "cody-composer-actions" }, Zt = ["disabled"], Jt = ["disabled", "aria-label", "title"], eo = {
  key: 3,
  class: "cody-composer-policy"
}, to = {
  key: 4,
  class: "cody-composer-image-error",
  role: "alert"
}, oo = {
  key: 5,
  class: "cody-composer-image-status",
  role: "status"
}, fo = /* @__PURE__ */ ee({
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
  setup(e, { emit: n }) {
    const l = ee({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(a, { emit: s }) {
        return () => ie("label", { class: "cody-composer-compact-control", title: a.label, "data-control": a.label }, [
          ie("select", { value: a.modelValue, disabled: a.disabled, "aria-label": a.label, onChange: (v) => s("update:modelValue", v.target.value) }, a.options.map((v) => ie("option", { value: v.value }, v.label)))
        ]);
      }
    }), r = e, t = n, u = F(null), C = F(null), g = F(r.draft), f = F(null), o = F(0), A = F(0), T = De(), m = `${T}-skill-menu`, S = O(() => {
      const a = f.value;
      return a ? r.skills.filter((s) => !r.selectedSkills.includes(s.value)).filter((s) => a.query ? `${s.label}
${s.description ?? ""}`.toLowerCase().includes(a.query) : !0).slice(0, 8) : [];
    }), E = O(() => f.value !== null), X = O(() => E.value && S.value.length ? se(Math.min(o.value, S.value.length - 1)) : void 0), N = O(() => {
      var a;
      return ((a = r.permissionOptions.find((s) => s.value === r.selectedPermission)) == null ? void 0 : a.description) ?? "";
    }), W = O(() => !r.disabled && !r.isUploadingImages && Ve({ text: r.draft, images: r.images, skills: r.selectedSkills })), oe = O(() => r.isRunning && r.selectedSubmitMode === "steer" ? "发送引导" : r.isRunning ? "加入队列" : "发送"), Y = O(() => r.imageUploadEnabled && A.value > 0);
    de(() => r.draft, (a) => {
      g.value = a;
    });
    function Z(a, s) {
      var v;
      return ((v = a.find((z) => z.value === s)) == null ? void 0 : v.label) ?? s;
    }
    function ae(a) {
      t("update:selected-skills", r.selectedSkills.filter((s) => s !== a));
    }
    function se(a) {
      return `${T}-skill-option-${String(a)}`;
    }
    function ne(a, s) {
      f.value = He(a, s, "$"), o.value = 0;
    }
    function le(a) {
      const s = a.target;
      g.value = s.value, t("update:draft", s.value), ne(s.value, s.selectionStart);
    }
    function p(a) {
      const s = a.target;
      ne(s.value, s.selectionStart);
    }
    function w() {
      window.setTimeout(() => {
        f.value = null;
      }, 0);
    }
    function b(a) {
      return Array.from(a).filter((s) => s.type.startsWith("image/"));
    }
    function y(a) {
      if (!r.imageUploadEnabled || r.disabled || r.isUploadingImages) return;
      const s = b(a);
      s.length && t("attach-images", s);
    }
    function k() {
      var a;
      (a = C.value) == null || a.click();
    }
    function x(a) {
      const s = a.target;
      s.files && y(s.files), s.value = "";
    }
    function h(a) {
      var v;
      const s = (v = a.clipboardData) == null ? void 0 : v.files;
      !(s != null && s.length) || b(s).length === 0 || (a.preventDefault(), y(s));
    }
    function j(a) {
      var s;
      !r.imageUploadEnabled || b(((s = a.dataTransfer) == null ? void 0 : s.files) ?? []).length === 0 || (a.preventDefault(), A.value += 1);
    }
    function q(a) {
      var s;
      !r.imageUploadEnabled || b(((s = a.dataTransfer) == null ? void 0 : s.files) ?? []).length === 0 || (a.preventDefault(), a.dataTransfer && (a.dataTransfer.dropEffect = "copy"));
    }
    function L(a) {
      !r.imageUploadEnabled || A.value === 0 || (a.preventDefault(), A.value = Math.max(0, A.value - 1));
    }
    function I(a) {
      var s;
      !r.imageUploadEnabled || !((s = a.dataTransfer) != null && s.files.length) || b(a.dataTransfer.files).length !== 0 && (a.preventDefault(), A.value = 0, y(a.dataTransfer.files));
    }
    function _(a) {
      const s = f.value;
      if (!s) return;
      const v = u.value, z = (v == null ? void 0 : v.value) || g.value, K = Ne(z, s);
      r.selectedSkills.includes(a) || t("update:selected-skills", [...r.selectedSkills, a]), t("update:draft", K.text), g.value = K.text, f.value = null, he(() => {
        const G = u.value;
        G == null || G.focus(), G == null || G.setSelectionRange(K.cursor, K.cursor);
      });
    }
    function D(a) {
      if (E.value) {
        if (a.key === "Escape") {
          a.preventDefault(), f.value = null;
          return;
        }
        if (a.key === "ArrowDown" || a.key === "ArrowUp") {
          a.preventDefault();
          const s = S.value.length;
          s && (o.value = (o.value + (a.key === "ArrowDown" ? 1 : -1) + s) % s);
          return;
        }
        if (a.key === "Enter" && !a.ctrlKey && !a.metaKey && S.value.length) {
          a.preventDefault(), _(S.value[Math.min(o.value, S.value.length - 1)].value);
          return;
        }
      }
      a.key !== "Enter" || a.isComposing || !a.ctrlKey && !a.metaKey || (a.preventDefault(), H());
    }
    function H() {
      W.value && t("send");
    }
    return (a, s) => (i(), d("form", {
      class: "cody-composer",
      "data-variant": e.variant,
      "data-cody-component": "composer-surface",
      onSubmit: me(H, ["prevent"])
    }, [
      c("div", {
        class: "cody-composer-shell",
        "data-image-drag-active": Y.value,
        onDragenter: j,
        onDragover: q,
        onDragleave: L,
        onDrop: I
      }, [
        c("input", {
          ref_key: "imageInputRef",
          ref: C,
          class: "cody-composer-image-input",
          type: "file",
          accept: "image/png,image/jpeg,image/webp,image/gif",
          multiple: "",
          tabindex: "-1",
          "aria-hidden": "true",
          onChange: x
        }, null, 544),
        e.images.length ? (i(), d("ul", Bt, [
          (i(!0), d(U, null, P(e.images, (v) => (i(), d("li", {
            key: v.id,
            class: "cody-composer-image"
          }, [
            c("img", {
              src: v.url,
              alt: v.name || "待发送图片"
            }, null, 8, Ft),
            c("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除图片 ${v.name || "附件"}`,
              onClick: (z) => t("remove-image", v.id)
            }, "×", 8, Pt)
          ]))), 128))
        ])) : M("", !0),
        e.selectedSkills.length ? (i(), d("div", jt, [
          (i(!0), d(U, null, P(e.selectedSkills, (v) => (i(), d("span", {
            key: v,
            class: "cody-composer-chip"
          }, [
            ce(" $" + $(Z(e.skills, v)) + " ", 1),
            c("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${Z(e.skills, v)}`,
              onClick: (z) => ae(v)
            }, "×", 8, zt)
          ]))), 128))
        ])) : M("", !0),
        c("textarea", {
          ref_key: "draftInputRef",
          ref: u,
          value: e.draft,
          rows: "1",
          disabled: e.disabled,
          placeholder: e.placeholder,
          "aria-expanded": E.value,
          "aria-controls": E.value ? m : void 0,
          "aria-activedescendant": X.value,
          "aria-autocomplete": "list",
          onInput: le,
          onClick: p,
          onKeyup: p,
          onBlur: w,
          onPaste: h,
          onKeydown: D
        }, null, 40, Vt),
        E.value ? (i(), d("div", {
          key: 2,
          id: m,
          class: "cody-composer-skill-menu",
          role: "listbox",
          "aria-label": "可引用 Skills"
        }, [
          S.value.length === 0 ? (i(), d("p", Nt, "没有匹配的 Skill")) : (i(!0), d(U, { key: 1 }, P(S.value, (v, z) => (i(), d("button", {
            id: se(z),
            key: v.value,
            class: ue(["cody-composer-skill-option", { active: z === o.value }]),
            type: "button",
            role: "option",
            "aria-selected": z === o.value,
            onMouseenter: (K) => o.value = z,
            onMousedown: me((K) => _(v.value), ["prevent"])
          }, [
            c("span", Wt, "$" + $(v.label), 1),
            v.description ? (i(), d("span", Kt, $(v.description), 1)) : M("", !0)
          ], 42, Ht))), 128))
        ])) : M("", !0),
        c("div", Gt, [
          c("div", Qt, [
            e.imageUploadEnabled ? (i(), d("button", {
              key: 0,
              class: "cody-composer-image-picker",
              type: "button",
              disabled: e.disabled || e.isUploadingImages,
              "aria-label": "添加图片",
              title: "添加图片（也可粘贴或拖拽）",
              onClick: k
            }, [...s[6] || (s[6] = [
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
            ])], 8, Xt)) : M("", !0),
            J(a.$slots, "leading"),
            e.collaborationModes.length ? (i(), pe(V(l), {
              key: 1,
              label: "协作模式",
              "model-value": e.selectedCollaborationMode,
              options: e.collaborationModes,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": s[0] || (s[0] = (v) => t("update:collaboration-mode", v))
            }, null, 8, ["model-value", "options", "disabled"])) : M("", !0),
            Q(V(l), {
              label: "提交策略",
              "model-value": e.selectedSubmitMode,
              options: e.submitModes,
              disabled: e.disabled,
              "onUpdate:modelValue": s[1] || (s[1] = (v) => t("update:submit-mode", v))
            }, null, 8, ["model-value", "options", "disabled"]),
            e.models.length ? (i(), pe(V(l), {
              key: 2,
              label: "模型",
              "model-value": e.selectedModel,
              options: e.models,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": s[2] || (s[2] = (v) => t("update:model", v))
            }, null, 8, ["model-value", "options", "disabled"])) : M("", !0),
            Q(V(l), {
              label: "推理强度",
              "model-value": e.selectedReasoning,
              options: e.reasoningOptions,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": s[3] || (s[3] = (v) => t("update:reasoning", v))
            }, null, 8, ["model-value", "options", "disabled"]),
            Q(V(l), {
              label: "权限",
              "model-value": e.selectedPermission,
              options: e.permissionOptions,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": s[4] || (s[4] = (v) => t("update:permission", v))
            }, null, 8, ["model-value", "options", "disabled"]),
            J(a.$slots, "controls")
          ]),
          c("div", Yt, [
            e.isRunning ? (i(), d("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: e.disabled,
              "aria-label": "停止当前回复",
              title: "停止当前回复",
              onClick: s[5] || (s[5] = (v) => t("stop"))
            }, [...s[7] || (s[7] = [
              c("span", {
                class: "cody-composer-stop-icon",
                "aria-hidden": "true"
              }, null, -1)
            ])], 8, Zt)) : M("", !0),
            c("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: !W.value,
              "aria-label": oe.value,
              title: oe.value
            }, [...s[8] || (s[8] = [
              c("svg", {
                viewBox: "0 0 24 24",
                "aria-hidden": "true"
              }, [
                c("path", { d: "M12 19V5m0 0-6 6m6-6 6 6" })
              ], -1)
            ])], 8, Jt)
          ])
        ]),
        N.value ? (i(), d("p", eo, $(N.value), 1)) : M("", !0),
        e.imageError ? (i(), d("p", to, $(e.imageError), 1)) : e.imageUploadEnabled && e.isUploadingImages ? (i(), d("p", oo, "正在处理图片…")) : M("", !0)
      ], 40, _t)
    ], 40, Ot));
  }
});
function vo() {
  const e = Te(re());
  let n = null, l = null, r = 0;
  const t = () => {
    r += 1, l == null || l(), l = null, n == null || n.dispose(), n = null;
  }, u = async (S, E) => {
    t(), e.value = re(S);
    const X = r, N = We(S, E);
    n = N, l = N.subscribe((W) => {
      n === N && r === X && (e.value = W);
    }), await N.start();
  }, C = async () => {
    await (n == null ? void 0 : n.refresh());
  }, g = async (S, E) => {
    if (!n) throw new Error("Conversation controller is not connected.");
    return n.submitUserMessage(S, E);
  }, f = async (S, E) => {
    if (!n) throw new Error("Conversation controller is not connected.");
    return n.retryFailedUserMessage(S, E);
  }, o = (S) => n == null ? void 0 : n.discardFailedUserMessage(S), A = async () => {
    if (!n) throw new Error("Conversation controller is not connected.");
    await n.interrupt();
  }, T = (S = "") => {
    t(), e.value = re(S);
  }, m = () => {
    t();
  };
  return Ee() && Ue(m), {
    state: O(() => e.value),
    connect: u,
    submitUserMessage: g,
    retryFailedUserMessage: f,
    discardFailedUserMessage: o,
    interrupt: A,
    refresh: C,
    reset: T,
    dispose: m
  };
}
export {
  fo as CodyComposer,
  go as CodyConversation,
  be as CodyMarkdown,
  pt as CodyRequestCard,
  te as DEFAULT_CODY_MARKDOWN_LABELS,
  po as conversationEntriesFromState,
  Ce as questionFieldsFromParams,
  ye as renderCodyMarkdown,
  Qe as requestSummary,
  ke as stabilizeStreamingMarkdown,
  vo as useConversationController
};
