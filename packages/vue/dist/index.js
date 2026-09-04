import { defineComponent as Y, ref as _, watch as se, nextTick as de, onMounted as he, onBeforeUnmount as $e, openBlock as r, createElementBlock as d, withModifiers as re, createElementVNode as c, createCommentVNode as q, computed as O, Fragment as U, createVNode as H, reactive as qe, toDisplayString as S, renderList as P, createTextVNode as ce, normalizeClass as ue, withDirectives as Le, withKeys as De, vModelDynamic as Me, renderSlot as ee, unref as V, h as le, useId as Te, createBlock as pe, shallowRef as Ee, getCurrentScope as Ue, onScopeDispose as Ie } from "vue";
import { buildApprovalRiskSummary as Re, toolStatusTone as ge, buildToolOutputPreview as Oe, isToolOutputTruncated as Be, toolOutputToggleLabel as _e } from "@codycodeagent/cody-web-core/presentation";
import we from "dompurify";
import Fe from "markdown-it";
import Pe from "markdown-it-footnote";
import je from "markdown-it-task-lists";
import { conversationFeedFromState as ze, formatTurnDuration as Ve, createConversationState as ie } from "@codycodeagent/cody-web-core/conversation";
import { composerHasContent as Ne, removeComposerTrigger as He, findComposerTrigger as Ke } from "@codycodeagent/cody-web-core/composer";
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
}, I = new Fe({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
I.use(je, { enabled: !1, label: !0, labelAfter: !0 });
I.use(Pe);
function F(e, n) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${e}" aria-label="${n}" title="${n}">${n}</button>`;
}
function Ce(e, n = "", s = te) {
  const i = n.toLowerCase();
  if (i === "mermaid" || i === "plantuml" || i === "puml") {
    const E = i === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${E}"><header class="markdown-diagram-toolbar"><span>${E}</span><span class="markdown-diagram-actions">${F("diagram-zoom-out", s.zoomOut)}${F("diagram-fit", s.fit)}${F("diagram-zoom-in", s.zoomIn)}${F("diagram-source", s.source)}${F("diagram-fullscreen", s.fullscreen)}${F("diagram-export-svg", "SVG")}${F("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${s.diagramAria(E)}"><p class="markdown-diagram-status">${s.rendering(E)}</p></div><pre class="markdown-diagram-source" hidden><code>${I.utils.escapeHtml(e)}</code></pre></div>
`;
  }
  const t = e.replace(/\n$/u, "").split(`
`), u = t.length <= 2 && t.every((E) => E.length <= 96), $ = t.length > 10, v = n || "text", y = [u ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(n) ? `language-${n}` : ""].filter(Boolean).join(" "), m = y ? ` class="${y}"` : "", o = [u ? "is-compact" : "", $ ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), T = $ ? `${v} · ${s.lineCount(t.length)}` : v, w = $ ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${s.collapseCode}" title="${s.collapseCode}" aria-expanded="false">${s.collapseCode}</button>` : "", p = $ ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${s.expandCode(t.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${o ? ` ${o}` : ""}" data-language="${v}" data-code-lines="${String(t.length)}"><header class="markdown-code-toolbar"><span>${T}</span><span class="markdown-code-actions">${w}${F("wrap-code", s.wrap)}${F("copy-code", s.copy)}${F("save-code", s.save)}</span></header><pre class="markdown-code-block${u ? " is-compact" : ""}"><code${m}>${I.utils.escapeHtml(e)}</code></pre>${p}</div></div>
`;
}
I.renderer.rules.fence = (e, n, s, i) => {
  const t = e[n];
  return Ce(t.content, t.info.trim().split(/\s+/u)[0] ?? "", i.labels);
};
I.renderer.rules.code_block = (e, n, s, i) => Ce(e[n].content, "", i.labels);
I.renderer.rules.table_open = (e, n, s, i) => {
  const t = i.labels ?? te;
  return `<section class="markdown-table-shell" role="region" aria-label="${t.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${F("copy-table", t.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
I.renderer.rules.table_close = () => `</table></div></section>
`;
const fe = I.renderer.rules.code_inline;
I.renderer.rules.code_inline = (e, n, s, i, t) => {
  const u = e[n].content, $ = u.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!$ || /\s/u.test(u)) return fe ? fe(e, n, s, i, t) : t.renderToken(e, n, s);
  const v = I.utils.escapeHtml($[1]), y = $[2] ?? "", m = i.labels ?? te;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${v}" data-file-line="${y}" title="${m.openFile(v)}"><code>${I.utils.escapeHtml(u)}</code></button>`;
};
const ve = I.renderer.rules.link_open;
I.renderer.rules.link_open = (e, n, s, i, t) => {
  const u = e[n];
  return /^https?:\/\//u.test(u.attrGet("href") ?? "") && (u.attrSet("target", "_blank"), u.attrSet("rel", "noopener noreferrer")), ve ? ve(e, n, s, i, t) : t.renderToken(e, n, s);
};
function ye(e, n = te) {
  return we.sanitize(I.render(e, { labels: n }), {
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
const Ge = ["aria-label"], Qe = ["src", "alt"], Se = /* @__PURE__ */ Y({
  __name: "CodyImagePreviewDialog",
  props: {
    src: {},
    alt: { default: "图片预览" }
  },
  emits: ["dismiss"],
  setup(e, { emit: n }) {
    const s = e, i = n, t = _(null);
    se(() => s.src, async (v) => {
      var y;
      v && (await de(), (y = t.value) == null || y.focus());
    }, { flush: "post" });
    function u() {
      i("dismiss");
    }
    function $(v) {
      v.key === "Escape" && s.src && (v.preventDefault(), u());
    }
    return he(() => window.addEventListener("keydown", $)), $e(() => window.removeEventListener("keydown", $)), (v, y) => e.src ? (r(), d("div", {
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
      }, null, 8, Qe)
    ], 8, Ge)) : q("", !0);
  }
}), Xe = ["innerHTML"], be = /* @__PURE__ */ Y({
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
    const s = e, i = n, t = O(() => s.labels ?? te), u = _(null), $ = _(ye(ke(s.text), t.value)), v = _(""), y = /* @__PURE__ */ new Set();
    let m = 0, o = 0;
    const T = {
      javascript: () => import("highlight.js/lib/languages/javascript"),
      typescript: () => import("highlight.js/lib/languages/typescript"),
      python: () => import("highlight.js/lib/languages/python"),
      go: () => import("highlight.js/lib/languages/go"),
      rust: () => import("highlight.js/lib/languages/rust"),
      json: () => import("highlight.js/lib/languages/json"),
      bash: () => import("highlight.js/lib/languages/bash"),
      sql: () => import("highlight.js/lib/languages/sql")
    };
    async function w(g) {
      window.clearTimeout(m), m = window.setTimeout(async () => {
        $.value = ye(ke(g), t.value), await de(), p();
      }, s.renderDelay);
    }
    async function p() {
      var x, b, f, A, C, j;
      for (const L of Array.from(((x = u.value) == null ? void 0 : x.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((b = L.textContent) == null ? void 0 : b.trim()) ?? "") && (L.dataset.numeric = "true");
      for (const L of Array.from(((f = u.value) == null ? void 0 : f.querySelectorAll("img")) ?? []))
        L.addEventListener("error", () => {
          L.alt = L.alt || "图片加载失败", L.classList.add("is-load-error");
        }, { once: !0 });
      E();
      for (const [L, D] of Array.from(((A = u.value) == null ? void 0 : A.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        D.dataset.codeIndex = String(L), D.classList.contains("is-collapsible") && y.has(L) && D.classList.remove("is-collapsed");
        for (const B of Array.from(D.querySelectorAll('[data-markdown-action="toggle-code"]')))
          B.setAttribute("aria-expanded", String(!D.classList.contains("is-collapsed")));
        const R = D.querySelector("pre"), M = D.querySelector('[data-markdown-action="wrap-code"]');
        R && M && (M.hidden = R.scrollWidth <= R.clientWidth + 2, M.setAttribute("aria-pressed", String(D.classList.contains("is-wrapped"))));
      }
      await Z();
      const g = Array.from(((C = u.value) == null ? void 0 : C.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (g.length === 0) return;
      const h = (await import("highlight.js/lib/core")).default;
      for (const L of g) {
        const D = ((j = Array.from(L.classList).find((B) => B.startsWith("language-"))) == null ? void 0 : j.slice(9)) ?? "", R = T[D];
        if (!R || L.dataset.highlighted === "yes") continue;
        const M = await R();
        h.getLanguage(D) || h.registerLanguage(D, M.default), L.innerHTML = h.highlight(L.textContent ?? "", { language: D }).value, L.dataset.highlighted = "yes";
      }
    }
    function E() {
      var h;
      if (!s.resolveAssetUrl) return;
      const g = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const x of Array.from(((h = u.value) == null ? void 0 : h.querySelectorAll("a[href]")) ?? [])) {
        const b = x.getAttribute("href") ?? "";
        if (!g.test(b) || /^(?:data|blob):/iu.test(b)) continue;
        const f = s.resolveAssetUrl(b);
        f && (x.href = f, x.target = "_blank", x.rel = "noopener noreferrer");
      }
    }
    async function Z() {
      var h, x, b, f;
      const g = Array.from(((h = u.value) == null ? void 0 : h.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const A of g) {
        A.dataset.rendered = "loading";
        const C = A.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", j = ((x = A.querySelector("code")) == null ? void 0 : x.textContent) ?? "", L = A.querySelector(".markdown-diagram-stage");
        if (L)
          try {
            let D = await ((b = s.renderDiagram) == null ? void 0 : b.call(s, { engine: C, source: j, dark: s.dark }));
            if (!D && C === "mermaid") {
              const { default: R } = await import("mermaid");
              R.initialize({ startOnLoad: !1, securityLevel: "strict", theme: s.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), D = (await R.render(`cody-diagram-${String(++o)}`, j)).svg;
            }
            if (!D) throw new Error(C === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            L.innerHTML = N(D), K(L), A.dataset.rendered = "yes", A.style.setProperty("--diagram-scale", "1");
          } catch (D) {
            L.textContent = D instanceof Error ? D.message : "图表渲染失败", L.classList.add("markdown-diagram-error"), (f = A.querySelector(".markdown-diagram-source")) == null || f.removeAttribute("hidden"), A.dataset.rendered = "error";
          }
      }
    }
    function N(g) {
      const h = we.sanitize(g, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), x = h.trimStart().startsWith("<svg") ? h : `<svg xmlns="http://www.w3.org/2000/svg">${h}</svg>`, b = new DOMParser().parseFromString(x, "image/svg+xml");
      if (b.querySelector("parsererror")) return "";
      for (const f of b.querySelectorAll("*")) for (const A of Array.from(f.attributes)) /^on/iu.test(A.name) && f.removeAttribute(A.name);
      return b.querySelectorAll("script").forEach((f) => f.remove()), new XMLSerializer().serializeToString(b.documentElement);
    }
    function K(g) {
      if (g.dataset.panReady === "true") return;
      g.dataset.panReady = "true";
      let h = 0, x = 0, b = 0, f = 0;
      g.addEventListener("pointerdown", (C) => {
        C.button === 0 && (h = C.clientX, x = C.clientY, b = g.scrollLeft, f = g.scrollTop, g.setPointerCapture(C.pointerId), g.classList.add("is-panning"));
      }), g.addEventListener("pointermove", (C) => {
        g.hasPointerCapture(C.pointerId) && (g.scrollLeft = b - (C.clientX - h), g.scrollTop = f - (C.clientY - x));
      });
      const A = (C) => {
        g.hasPointerCapture(C.pointerId) && g.releasePointerCapture(C.pointerId), g.classList.remove("is-panning");
      };
      g.addEventListener("pointerup", A), g.addEventListener("pointercancel", A);
    }
    function W(g, h = 0) {
      const x = Number(g.style.getPropertyValue("--diagram-scale") || "1");
      g.style.setProperty("--diagram-scale", String(h === 0 ? 1 : Math.min(2.5, Math.max(0.4, x + h))));
    }
    function oe(g, h) {
      const x = document.createElement("a");
      x.href = URL.createObjectURL(g), x.download = h, x.click(), URL.revokeObjectURL(x.href);
    }
    async function J(g, h) {
      const x = h.textContent;
      try {
        await navigator.clipboard.writeText(g), h.textContent = "已复制";
      } catch {
        const b = document.createElement("textarea");
        b.value = g, b.style.position = "fixed", b.style.opacity = "0", document.body.appendChild(b), b.select();
        const f = document.execCommand("copy");
        b.remove(), h.textContent = f ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        h.textContent = x;
      }, 1200);
    }
    function ne(g) {
      return Array.from((g == null ? void 0 : g.rows) ?? []).map((h) => Array.from(h.cells).map((x) => {
        var b;
        return `"${((b = x.textContent) == null ? void 0 : b.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function ae(g) {
      var j, L, D, R;
      const h = g.target, x = h.closest("img");
      if (x) {
        v.value = x.currentSrc || x.src;
        return;
      }
      const b = h.closest("[data-markdown-action]");
      if (!b) return;
      const f = b.closest(".markdown-code-shell, .markdown-table-shell"), A = b.dataset.markdownAction;
      if (A === "copy-code" && J(((j = f == null ? void 0 : f.querySelector("code")) == null ? void 0 : j.textContent) ?? "", b), A === "wrap-code") {
        const M = (f == null ? void 0 : f.classList.toggle("is-wrapped")) ?? !1;
        b.textContent = M && t.value.scroll || t.value.wrap, b.setAttribute("aria-pressed", String(M));
      }
      if (A === "save-code" && oe(new Blob([((L = f == null ? void 0 : f.querySelector("code")) == null ? void 0 : L.textContent) ?? ""], { type: "text/plain" }), `snippet.${(f == null ? void 0 : f.dataset.language) || "txt"}`), A === "toggle-code" && (f != null && f.classList.contains("is-collapsible"))) {
        const M = Number(f.dataset.codeIndex ?? -1), B = !f.classList.toggle("is-collapsed");
        M >= 0 && (B ? y.add(M) : y.delete(M));
        for (const G of Array.from(f.querySelectorAll('[data-markdown-action="toggle-code"]'))) G.setAttribute("aria-expanded", String(B));
      }
      if (A === "copy-table" && J(ne((f == null ? void 0 : f.querySelector("table")) ?? null), b), A === "open-file") {
        const M = b.dataset.filePath ?? "", B = ((D = s.cwd) == null ? void 0 : D.replace(/\/$/u, "")) ?? "", G = M.startsWith("/") && B && M.startsWith(`${B}/`) ? M.slice(B.length + 1) : M.replace(/^\.\//u, "");
        i("openFile", { path: G, line: Number(b.dataset.fileLine || 0) || 1 });
      }
      const C = b.closest(".markdown-diagram-shell");
      if (C && A === "diagram-zoom-in" && W(C, 0.2), C && A === "diagram-zoom-out" && W(C, -0.2), C && A === "diagram-fit" && W(C), C && A === "diagram-source") {
        const M = C.querySelector(".markdown-diagram-source");
        M && (M.hidden = !M.hidden);
      }
      if (C && A === "diagram-fullscreen" && ((R = C.requestFullscreen) == null || R.call(C)), C && A === "diagram-export-svg") {
        const M = C.querySelector("svg");
        M && oe(new Blob([new XMLSerializer().serializeToString(M)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    return se(() => [s.text, s.labels], ([g]) => {
      w(g);
    }, { deep: !0 }), he(() => {
      p();
    }), $e(() => window.clearTimeout(m)), (g, h) => (r(), d(U, null, [
      c("div", {
        ref_key: "rootRef",
        ref: u,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: $.value,
        onClick: ae
      }, null, 8, Xe),
      H(Se, {
        src: v.value,
        alt: "Markdown 图片预览",
        onDismiss: h[0] || (h[0] = (x) => v.value = "")
      }, null, 8, ["src"])
    ], 64));
  }
});
function xe(e) {
  if (!e || typeof e != "object") return [];
  const n = e;
  return (Array.isArray(n.questions) ? n.questions : []).flatMap((i, t) => {
    if (!i || typeof i != "object") return [];
    const u = i, $ = typeof u.question == "string" ? u.question.trim() : "";
    if (!$) return [];
    const v = Array.isArray(u.options) ? u.options : [];
    return [{
      id: typeof u.id == "string" && u.id.trim() ? u.id.trim() : `question-${String(t + 1)}`,
      header: typeof u.header == "string" ? u.header.trim() : "",
      question: $,
      isOther: u.isOther === !0,
      isSecret: u.isSecret === !0,
      options: v.flatMap((y) => {
        if (!y || typeof y != "object") return [];
        const m = y, o = typeof m.label == "string" ? m.label.trim() : "";
        return o ? [{ label: o, description: typeof m.description == "string" ? m.description.trim() : "" }] : [];
      })
    }];
  });
}
function Ye(e) {
  var i;
  if (!e || typeof e != "object") return "Codex 请求执行一项受保护操作。";
  const n = e, s = n.reason ?? n.question ?? n.command;
  return typeof s == "string" && s.trim() ? s : ((i = xe(e)[0]) == null ? void 0 : i.question) ?? "Codex 请求执行一项受保护操作。";
}
function vo(e) {
  var i;
  const n = [], s = (t) => {
    if (t.kind === "reasoning") {
      n.push({ id: t.id, kind: "reasoning", text: t.text });
      return;
    }
    if (!t.tool.summary && t.tool.details.length === 0 && !t.tool.output && t.tool.kind !== "fileChange") return;
    if (t.tool.kind !== "fileChange") {
      n.push({ id: t.id, kind: "tool", tool: t.tool });
      return;
    }
    const u = `file-group:${t.turnId ?? t.id}`, $ = n.at(-1);
    if (!$ || $.kind !== "tool" || $.id !== u) {
      const m = [...new Set(t.tool.details)], o = {
        id: u,
        kind: "tool",
        tool: {
          ...t.tool,
          title: m.length > 1 ? `文件变更 · ${String(m.length)} 个文件` : "文件变更",
          summary: m.length ? `${String(m.length)} 个文件已更新` : t.tool.summary,
          details: m
        }
      };
      n.push(o);
      return;
    }
    const v = [.../* @__PURE__ */ new Set([...$.tool.details, ...t.tool.details])], y = [$.tool.output, t.tool.output].filter(Boolean).join(`

`);
    $.tool = {
      ...$.tool,
      status: /fail|error|cancel|reject/iu.test(`${$.tool.status} ${t.tool.status}`) ? "failed" : t.tool.status,
      title: v.length > 1 ? `文件变更 · ${String(v.length)} 个文件` : "文件变更",
      summary: v.length ? `${String(v.length)} 个文件已更新` : t.tool.summary,
      details: v,
      ...y ? { output: y } : {}
    };
  };
  for (const t of ze(e))
    if (t.kind === "message") n.push({ id: t.id, kind: "message", message: t.message });
    else if (t.kind === "timeline") s(t.entry);
    else if (t.kind === "plan") n.push({ id: t.id, kind: "plan", text: t.plan.text });
    else if (t.kind === "request") n.push({ id: t.id, kind: "request", request: t.request });
    else if (t.kind === "turn" && t.status === "failed") n.push({ id: t.id, kind: "failure", text: t.error });
    else {
      if (t.kind === "turn" && t.status === "interrupted") continue;
      t.kind === "turn" && t.status === "completed" ? n.push({ id: t.id, kind: "worked", label: `Worked for ${Ve(t.durationMs ?? 0)}` }) : t.kind === "activity" && n.push({
        id: t.id,
        kind: "activity",
        title: t.status === "waiting" ? ((i = e.pendingRequests.find((u) => !u.turnId || u.turnId === t.turnId)) == null ? void 0 : i.kind) === "approval" ? "等待你的审批" : "等待你的回答" : t.label,
        detail: t.status === "waiting" ? "处理后 Codex 会继续本次回复" : t.status === "retrying" ? e.connection.status === "disconnected" ? "连接已中断，等待恢复" : "正在恢复本次回复" : e.connection.status === "connected" ? "实时更新中" : "等待恢复连接",
        tone: t.status
      });
    }
  return n;
}
const Ze = ["data-kind"], Je = { class: "cody-request-heading" }, et = { key: 0 }, tt = {
  key: 0,
  class: "cody-question-options"
}, ot = ["onClick"], at = { key: 0 }, st = ["onUpdate:modelValue", "type", "placeholder"], nt = { class: "cody-request-actions" }, lt = ["disabled"], it = { class: "cody-approval-risk-heading" }, rt = ["data-level"], dt = { class: "cody-approval-risk-subject" }, ct = {
  key: 0,
  class: "cody-approval-risk-labels"
}, ut = {
  key: 1,
  class: "cody-approval-risk-details"
}, mt = { class: "cody-approval-risk-recommendation" }, pt = { key: 1 }, gt = {
  key: 2,
  class: "cody-request-actions"
}, ft = /* @__PURE__ */ Y({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(e, { emit: n }) {
    const s = e, i = n, t = qe({}), u = O(() => xe(s.request.params)), $ = O(() => Ye(s.request.params)), v = O(() => s.request.kind === "approval" ? Re({ method: s.request.method, params: s.request.params }) : null), y = O(() => u.value.length > 0 && u.value.every((o) => {
      var T;
      return !!((T = t[o.id]) != null && T.trim());
    }));
    se(() => s.request.id, () => {
      for (const o of Object.keys(t)) delete t[o];
    });
    function m() {
      y.value && i("resolveQuestion", s.request.id, Object.fromEntries(u.value.map((o) => [o.id, { answers: [t[o.id].trim()] }])));
    }
    return (o, T) => (r(), d("article", {
      class: "cody-request-card",
      "data-kind": e.request.kind
    }, [
      c("div", Je, [
        c("strong", null, S(e.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        T[2] || (T[2] = c("small", null, "Agent 已暂停等待", -1))
      ]),
      e.request.kind === "question" && u.value.length ? (r(), d(U, { key: 0 }, [
        (r(!0), d(U, null, P(u.value, (w) => (r(), d("fieldset", {
          key: w.id,
          class: "cody-question-field"
        }, [
          c("legend", null, [
            w.header ? (r(), d("span", et, S(w.header), 1)) : q("", !0),
            ce(S(w.question), 1)
          ]),
          w.options.length ? (r(), d("div", tt, [
            (r(!0), d(U, null, P(w.options, (p) => (r(), d("button", {
              key: p.label,
              type: "button",
              class: ue({ selected: t[w.id] === p.label }),
              onClick: (E) => t[w.id] = p.label
            }, [
              c("strong", null, S(p.label), 1),
              p.description ? (r(), d("small", at, S(p.description), 1)) : q("", !0)
            ], 10, ot))), 128))
          ])) : q("", !0),
          w.options.length === 0 || w.isOther ? Le((r(), d("input", {
            key: 1,
            "onUpdate:modelValue": (p) => t[w.id] = p,
            type: w.isSecret ? "password" : "text",
            placeholder: w.options.length ? "其他回答…" : "输入回答…",
            onKeyup: De(m, ["enter"])
          }, null, 40, st)), [
            [Me, t[w.id]]
          ]) : q("", !0)
        ]))), 128)),
        c("div", nt, [
          c("button", {
            type: "button",
            disabled: !y.value,
            onClick: m
          }, "提交回答", 8, lt)
        ])
      ], 64)) : (r(), d(U, { key: 1 }, [
        v.value ? (r(), d(U, { key: 0 }, [
          c("div", it, [
            c("div", null, [
              c("strong", null, S(v.value.title), 1),
              c("p", null, S(v.value.description), 1)
            ]),
            c("span", {
              class: "cody-approval-risk-level",
              "data-level": v.value.level
            }, S(v.value.level), 9, rt)
          ]),
          c("code", dt, S(v.value.subject), 1),
          v.value.riskLabels.length ? (r(), d("ul", ct, [
            (r(!0), d(U, null, P(v.value.riskLabels, (w) => (r(), d("li", { key: w }, S(w), 1))), 128))
          ])) : q("", !0),
          v.value.impacts.length ? (r(), d("details", ut, [
            T[3] || (T[3] = c("summary", null, "查看影响", -1)),
            c("ul", null, [
              (r(!0), d(U, null, P(v.value.impacts, (w) => (r(), d("li", { key: w }, S(w), 1))), 128))
            ])
          ])) : q("", !0),
          c("p", mt, S(v.value.recommendation), 1)
        ], 64)) : (r(), d("p", pt, S($.value), 1)),
        e.request.kind === "approval" ? (r(), d("div", gt, [
          c("button", {
            type: "button",
            onClick: T[0] || (T[0] = (w) => i("resolveApproval", e.request.id, "accept"))
          }, "允许一次"),
          c("button", {
            type: "button",
            "data-tone": "danger",
            onClick: T[1] || (T[1] = (w) => i("resolveApproval", e.request.id, "decline"))
          }, "拒绝")
        ])) : q("", !0)
      ], 64))
    ], 8, Ze));
  }
}), vt = ["data-variant"], yt = {
  key: 0,
  class: "cody-conversation-loading",
  role: "status"
}, kt = {
  key: 1,
  class: "cody-conversation-empty"
}, bt = {
  key: 0,
  class: "cody-worked-divider"
}, ht = ["data-role"], $t = ["data-role"], wt = { class: "cody-message-stack" }, Ct = { class: "cody-message-label" }, St = {
  key: 0,
  class: "cody-message-skills"
}, xt = {
  key: 1,
  class: "cody-message-body"
}, At = {
  key: 2,
  class: "cody-message-images"
}, qt = ["onClick"], Lt = ["src"], Dt = ["onClick"], Mt = ["onClick"], Tt = ["data-tone", "open"], Et = { key: 0 }, Ut = ["onClick"], It = {
  key: 3,
  class: "cody-reasoning-card"
}, Rt = {
  key: 4,
  class: "cody-plan-card",
  open: ""
}, Ot = {
  key: 6,
  class: "cody-failure-card"
}, Bt = {
  key: 7,
  class: "cody-interrupted-card",
  role: "status"
}, _t = ["data-tone"], yo = /* @__PURE__ */ Y({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "retryMessage", "resolveApproval", "resolveQuestion"],
  setup(e, { emit: n }) {
    const s = n, i = _({}), t = _("");
    function u(y) {
      i.value = {
        ...i.value,
        [y]: i.value[y] !== !0
      };
    }
    function $(y, m) {
      s("resolveApproval", y, m);
    }
    function v(y, m) {
      s("resolveQuestion", y, m);
    }
    return (y, m) => (r(), d("section", {
      class: "cody-conversation",
      "data-variant": e.variant,
      "data-cody-component": "conversation-surface"
    }, [
      e.loading ? (r(), d("div", yt, "正在同步对话…")) : e.entries.length === 0 ? (r(), d("div", kt, [
        ee(y.$slots, "empty", {}, () => [
          m[3] || (m[3] = ce("开始这个需求的开发", -1))
        ])
      ])) : (r(!0), d(U, { key: 2 }, P(e.entries, (o) => {
        var T, w;
        return r(), d(U, {
          key: o.id
        }, [
          o.kind === "worked" ? (r(), d("div", bt, [
            c("span", null, S(o.label), 1)
          ])) : o.kind === "message" ? (r(), d("article", {
            key: 1,
            class: "cody-message",
            "data-role": o.message.role
          }, [
            c("div", {
              class: "cody-message-identity",
              "data-role": o.message.role
            }, S(o.message.role === "user" ? "你" : "CW"), 9, $t),
            c("div", wt, [
              c("div", Ct, S(o.message.role === "user" ? "你" : o.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (T = o.message.skills) != null && T.length ? (r(), d("ul", St, [
                (r(!0), d(U, null, P(o.message.skills, (p) => (r(), d("li", {
                  key: `${p.name}:${p.path}`
                }, "$" + S(p.displayName || p.name), 1))), 128))
              ])) : q("", !0),
              o.message.text ? (r(), d("div", xt, [
                ee(y.$slots, "markdown", {
                  message: o.message
                }, () => [
                  H(be, {
                    text: o.message.text,
                    onOpenFile: m[0] || (m[0] = (p) => s("openFile", p))
                  }, null, 8, ["text"])
                ])
              ])) : q("", !0),
              (w = o.message.images) != null && w.length ? (r(), d("div", At, [
                (r(!0), d(U, null, P(o.message.images, (p) => (r(), d("button", {
                  key: p,
                  type: "button",
                  "aria-label": "打开对话图片预览",
                  onClick: (E) => t.value = p
                }, [
                  c("img", {
                    src: p,
                    alt: "对话图片",
                    loading: "lazy"
                  }, null, 8, Lt)
                ], 8, qt))), 128))
              ])) : q("", !0),
              o.message.outbox ? (r(), d("div", {
                key: 3,
                class: ue(["cody-message-outbox", o.message.outbox.status]),
                role: "status"
              }, [
                c("span", null, S(o.message.outbox.status === "failed" ? `发送失败${o.message.outbox.lastError ? `：${o.message.outbox.lastError}` : ""}` : o.message.outbox.status === "queued" ? "已加入发送队列" : "正在发送…"), 1),
                o.message.outbox.status === "failed" ? (r(), d("button", {
                  key: 0,
                  class: "cody-message-retry",
                  type: "button",
                  onClick: (p) => s("retryMessage", o.message)
                }, "重试此消息", 8, Dt)) : q("", !0)
              ], 2)) : q("", !0),
              o.message.text ? (r(), d("button", {
                key: 4,
                class: "cody-copy-button",
                type: "button",
                onClick: (p) => s("copy", o.message.text)
              }, "复制", 8, Mt)) : q("", !0)
            ])
          ], 8, ht)) : o.kind === "tool" ? (r(), d("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": V(ge)(o.tool.status),
            open: V(ge)(o.tool.status) === "working"
          }, [
            c("summary", null, [
              m[4] || (m[4] = c("span", null, "⌁", -1)),
              c("strong", null, S(o.tool.title), 1),
              c("small", null, S(o.tool.status), 1)
            ]),
            c("p", null, S(o.tool.summary), 1),
            o.tool.details.length ? (r(), d("ul", Et, [
              (r(!0), d(U, null, P(o.tool.details, (p) => (r(), d("li", { key: p }, S(p), 1))), 128))
            ])) : q("", !0),
            o.tool.output ? (r(), d(U, { key: 1 }, [
              c("pre", null, S(i.value[o.id] ? o.tool.output : V(Oe)(o.tool.output)), 1),
              V(Be)(o.tool.output) ? (r(), d("button", {
                key: 0,
                class: "cody-tool-output-toggle",
                type: "button",
                onClick: (p) => u(o.id)
              }, S(V(_e)(i.value[o.id] === !0)), 9, Ut)) : q("", !0)
            ], 64)) : q("", !0)
          ], 8, Tt)) : o.kind === "reasoning" ? (r(), d("details", It, [
            c("summary", null, "✦ " + S(o.title || "推理过程"), 1),
            c("pre", null, S(o.text), 1)
          ])) : o.kind === "plan" ? (r(), d("details", Rt, [
            m[5] || (m[5] = c("summary", null, "计划", -1)),
            H(be, {
              text: o.text,
              onOpenFile: m[1] || (m[1] = (p) => s("openFile", p))
            }, null, 8, ["text"])
          ])) : o.kind === "request" ? ee(y.$slots, "request", {
            request: o.request
          }, () => [
            H(ft, {
              request: o.request,
              onResolveApproval: $,
              onResolveQuestion: v
            }, null, 8, ["request"])
          ], void 0, 5) : o.kind === "failure" ? (r(), d("details", Ot, [
            m[6] || (m[6] = c("summary", null, "本次回复失败", -1)),
            c("p", null, S(o.text), 1)
          ])) : o.kind === "interrupted" ? (r(), d("article", Bt, S(o.text), 1)) : o.kind === "activity" ? (r(), d("article", {
            key: 8,
            class: "cody-conversation-activity",
            "data-tone": o.tone,
            role: "status",
            "aria-live": "polite"
          }, [
            m[7] || (m[7] = c("span", {
              class: "cody-activity-pulse",
              "aria-hidden": "true"
            }, null, -1)),
            c("strong", null, S(o.title), 1),
            c("small", null, S(o.detail), 1)
          ], 8, _t)) : q("", !0)
        ], 64);
      }), 128)),
      H(Se, {
        src: t.value,
        alt: "对话图片预览",
        onDismiss: m[2] || (m[2] = (o) => t.value = "")
      }, null, 8, ["src"])
    ], 8, vt));
  }
}), Ft = ["data-variant"], Pt = ["data-image-drag-active"], jt = {
  key: 0,
  class: "cody-composer-images",
  "aria-label": "已添加图片"
}, zt = ["src", "alt"], Vt = ["disabled", "aria-label", "onClick"], Nt = {
  key: 1,
  class: "cody-composer-selected",
  "aria-label": "已引用 Skills"
}, Ht = ["disabled", "aria-label", "onClick"], Kt = ["value", "disabled", "placeholder", "aria-expanded", "aria-controls", "aria-activedescendant"], Wt = {
  key: 0,
  class: "cody-composer-skill-status"
}, Gt = ["id", "aria-selected", "onMouseenter", "onMousedown"], Qt = { class: "cody-composer-skill-option-name" }, Xt = {
  key: 0,
  class: "cody-composer-skill-option-description"
}, Yt = { class: "cody-composer-controls" }, Zt = {
  class: "cody-composer-settings",
  "aria-label": "运行设置"
}, Jt = ["disabled"], eo = { class: "cody-composer-actions" }, to = ["disabled"], oo = ["disabled", "aria-label", "title"], ao = {
  key: 3,
  class: "cody-composer-policy"
}, so = {
  key: 4,
  class: "cody-composer-image-error",
  role: "alert"
}, no = {
  key: 5,
  class: "cody-composer-image-status",
  role: "status"
}, ko = /* @__PURE__ */ Y({
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
    const s = Y({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(a, { emit: l }) {
        return () => le("label", { class: "cody-composer-compact-control", title: a.label, "data-control": a.label }, [
          le("select", { value: a.modelValue, disabled: a.disabled, "aria-label": a.label, onChange: (k) => l("update:modelValue", k.target.value) }, a.options.map((k) => le("option", { value: k.value }, k.label)))
        ]);
      }
    }), i = e, t = n, u = _(null), $ = _(null), v = _(i.draft), y = _(null), m = _(0), o = _(0), T = Te(), w = `${T}-skill-menu`, p = O(() => {
      const a = y.value;
      return a ? i.skills.filter((l) => !i.selectedSkills.includes(l.value)).filter((l) => a.query ? `${l.label}
${l.description ?? ""}`.toLowerCase().includes(a.query) : !0).slice(0, 8) : [];
    }), E = O(() => y.value !== null), Z = O(() => E.value && p.value.length ? ae(Math.min(m.value, p.value.length - 1)) : void 0), N = O(() => {
      var a;
      return ((a = i.permissionOptions.find((l) => l.value === i.selectedPermission)) == null ? void 0 : a.description) ?? "";
    }), K = O(() => !i.disabled && !i.isUploadingImages && Ne({ text: i.draft, images: i.images, skills: i.selectedSkills })), W = O(() => i.isRunning && i.selectedSubmitMode === "steer" ? "发送引导" : i.isRunning ? "加入队列" : "发送"), oe = O(() => i.imageUploadEnabled && o.value > 0);
    se(() => i.draft, (a) => {
      v.value = a;
    });
    function J(a, l) {
      var k;
      return ((k = a.find((z) => z.value === l)) == null ? void 0 : k.label) ?? l;
    }
    function ne(a) {
      t("update:selected-skills", i.selectedSkills.filter((l) => l !== a));
    }
    function ae(a) {
      return `${T}-skill-option-${String(a)}`;
    }
    function g(a, l) {
      y.value = Ke(a, l, "$"), m.value = 0;
    }
    function h(a) {
      const l = a.target;
      v.value = l.value, t("update:draft", l.value), g(l.value, l.selectionStart);
    }
    function x(a) {
      const l = a.target;
      g(l.value, l.selectionStart);
    }
    function b() {
      window.setTimeout(() => {
        y.value = null;
      }, 0);
    }
    function f(a) {
      return Array.from(a).filter((l) => l.type.startsWith("image/"));
    }
    function A(a) {
      if (!i.imageUploadEnabled || i.disabled || i.isUploadingImages) return;
      const l = f(a);
      l.length && t("attach-images", l);
    }
    function C() {
      var a;
      (a = $.value) == null || a.click();
    }
    function j(a) {
      const l = a.target;
      l.files && A(l.files), l.value = "";
    }
    function L(a) {
      var k;
      const l = (k = a.clipboardData) == null ? void 0 : k.files;
      !(l != null && l.length) || f(l).length === 0 || (a.preventDefault(), A(l));
    }
    function D(a) {
      var l;
      !i.imageUploadEnabled || f(((l = a.dataTransfer) == null ? void 0 : l.files) ?? []).length === 0 || (a.preventDefault(), o.value += 1);
    }
    function R(a) {
      var l;
      !i.imageUploadEnabled || f(((l = a.dataTransfer) == null ? void 0 : l.files) ?? []).length === 0 || (a.preventDefault(), a.dataTransfer && (a.dataTransfer.dropEffect = "copy"));
    }
    function M(a) {
      !i.imageUploadEnabled || o.value === 0 || (a.preventDefault(), o.value = Math.max(0, o.value - 1));
    }
    function B(a) {
      var l;
      !i.imageUploadEnabled || !((l = a.dataTransfer) != null && l.files.length) || f(a.dataTransfer.files).length !== 0 && (a.preventDefault(), o.value = 0, A(a.dataTransfer.files));
    }
    function G(a) {
      const l = y.value;
      if (!l) return;
      const k = u.value, z = (k == null ? void 0 : k.value) || v.value, Q = He(z, l);
      i.selectedSkills.includes(a) || t("update:selected-skills", [...i.selectedSkills, a]), t("update:draft", Q.text), v.value = Q.text, y.value = null, de(() => {
        const X = u.value;
        X == null || X.focus(), X == null || X.setSelectionRange(Q.cursor, Q.cursor);
      });
    }
    function Ae(a) {
      if (E.value) {
        if (a.key === "Escape") {
          a.preventDefault(), y.value = null;
          return;
        }
        if (a.key === "ArrowDown" || a.key === "ArrowUp") {
          a.preventDefault();
          const l = p.value.length;
          l && (m.value = (m.value + (a.key === "ArrowDown" ? 1 : -1) + l) % l);
          return;
        }
        if (a.key === "Enter" && !a.ctrlKey && !a.metaKey && p.value.length) {
          a.preventDefault(), G(p.value[Math.min(m.value, p.value.length - 1)].value);
          return;
        }
      }
      a.key !== "Enter" || a.isComposing || !a.ctrlKey && !a.metaKey || (a.preventDefault(), me());
    }
    function me() {
      K.value && t("send");
    }
    return (a, l) => (r(), d("form", {
      class: "cody-composer",
      "data-variant": e.variant,
      "data-cody-component": "composer-surface",
      onSubmit: re(me, ["prevent"])
    }, [
      c("div", {
        class: "cody-composer-shell",
        "data-image-drag-active": oe.value,
        onDragenter: D,
        onDragover: R,
        onDragleave: M,
        onDrop: B
      }, [
        c("input", {
          ref_key: "imageInputRef",
          ref: $,
          class: "cody-composer-image-input",
          type: "file",
          accept: "image/png,image/jpeg,image/webp,image/gif",
          multiple: "",
          tabindex: "-1",
          "aria-hidden": "true",
          onChange: j
        }, null, 544),
        e.images.length ? (r(), d("ul", jt, [
          (r(!0), d(U, null, P(e.images, (k) => (r(), d("li", {
            key: k.id,
            class: "cody-composer-image"
          }, [
            c("img", {
              src: k.url,
              alt: k.name || "待发送图片"
            }, null, 8, zt),
            c("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除图片 ${k.name || "附件"}`,
              onClick: (z) => t("remove-image", k.id)
            }, "×", 8, Vt)
          ]))), 128))
        ])) : q("", !0),
        e.selectedSkills.length ? (r(), d("div", Nt, [
          (r(!0), d(U, null, P(e.selectedSkills, (k) => (r(), d("span", {
            key: k,
            class: "cody-composer-chip"
          }, [
            ce(" $" + S(J(e.skills, k)) + " ", 1),
            c("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${J(e.skills, k)}`,
              onClick: (z) => ne(k)
            }, "×", 8, Ht)
          ]))), 128))
        ])) : q("", !0),
        c("textarea", {
          ref_key: "draftInputRef",
          ref: u,
          value: e.draft,
          rows: "1",
          disabled: e.disabled,
          placeholder: e.placeholder,
          "aria-expanded": E.value,
          "aria-controls": E.value ? w : void 0,
          "aria-activedescendant": Z.value,
          "aria-autocomplete": "list",
          onInput: h,
          onClick: x,
          onKeyup: x,
          onBlur: b,
          onPaste: L,
          onKeydown: Ae
        }, null, 40, Kt),
        E.value ? (r(), d("div", {
          key: 2,
          id: w,
          class: "cody-composer-skill-menu",
          role: "listbox",
          "aria-label": "可引用 Skills"
        }, [
          p.value.length === 0 ? (r(), d("p", Wt, "没有匹配的 Skill")) : (r(!0), d(U, { key: 1 }, P(p.value, (k, z) => (r(), d("button", {
            id: ae(z),
            key: k.value,
            class: ue(["cody-composer-skill-option", { active: z === m.value }]),
            type: "button",
            role: "option",
            "aria-selected": z === m.value,
            onMouseenter: (Q) => m.value = z,
            onMousedown: re((Q) => G(k.value), ["prevent"])
          }, [
            c("span", Qt, "$" + S(k.label), 1),
            k.description ? (r(), d("span", Xt, S(k.description), 1)) : q("", !0)
          ], 42, Gt))), 128))
        ])) : q("", !0),
        c("div", Yt, [
          c("div", Zt, [
            e.imageUploadEnabled ? (r(), d("button", {
              key: 0,
              class: "cody-composer-image-picker",
              type: "button",
              disabled: e.disabled || e.isUploadingImages,
              "aria-label": "添加图片",
              title: "添加图片（也可粘贴或拖拽）",
              onClick: C
            }, [...l[6] || (l[6] = [
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
            ])], 8, Jt)) : q("", !0),
            ee(a.$slots, "leading"),
            e.collaborationModes.length ? (r(), pe(V(s), {
              key: 1,
              label: "协作模式",
              "model-value": e.selectedCollaborationMode,
              options: e.collaborationModes,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": l[0] || (l[0] = (k) => t("update:collaboration-mode", k))
            }, null, 8, ["model-value", "options", "disabled"])) : q("", !0),
            H(V(s), {
              label: "提交策略",
              "model-value": e.selectedSubmitMode,
              options: e.submitModes,
              disabled: e.disabled,
              "onUpdate:modelValue": l[1] || (l[1] = (k) => t("update:submit-mode", k))
            }, null, 8, ["model-value", "options", "disabled"]),
            e.models.length ? (r(), pe(V(s), {
              key: 2,
              label: "模型",
              "model-value": e.selectedModel,
              options: e.models,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": l[2] || (l[2] = (k) => t("update:model", k))
            }, null, 8, ["model-value", "options", "disabled"])) : q("", !0),
            H(V(s), {
              label: "推理强度",
              "model-value": e.selectedReasoning,
              options: e.reasoningOptions,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": l[3] || (l[3] = (k) => t("update:reasoning", k))
            }, null, 8, ["model-value", "options", "disabled"]),
            H(V(s), {
              label: "权限",
              "model-value": e.selectedPermission,
              options: e.permissionOptions,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": l[4] || (l[4] = (k) => t("update:permission", k))
            }, null, 8, ["model-value", "options", "disabled"]),
            ee(a.$slots, "controls")
          ]),
          c("div", eo, [
            e.isRunning ? (r(), d("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: e.disabled,
              "aria-label": "停止当前回复",
              title: "停止当前回复",
              onClick: l[5] || (l[5] = (k) => t("stop"))
            }, [...l[7] || (l[7] = [
              c("span", {
                class: "cody-composer-stop-icon",
                "aria-hidden": "true"
              }, null, -1)
            ])], 8, to)) : q("", !0),
            c("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: !K.value,
              "aria-label": W.value,
              title: W.value
            }, [...l[8] || (l[8] = [
              c("svg", {
                viewBox: "0 0 24 24",
                "aria-hidden": "true"
              }, [
                c("path", { d: "M12 19V5m0 0-6 6m6-6 6 6" })
              ], -1)
            ])], 8, oo)
          ])
        ]),
        N.value ? (r(), d("p", ao, S(N.value), 1)) : q("", !0),
        e.imageError ? (r(), d("p", so, S(e.imageError), 1)) : e.imageUploadEnabled && e.isUploadingImages ? (r(), d("p", no, "正在处理图片…")) : q("", !0)
      ], 40, Pt)
    ], 40, Ft));
  }
});
function bo() {
  const e = Ee(ie());
  let n = null, s = null, i = 0;
  const t = () => {
    i += 1, s == null || s(), s = null, n == null || n.dispose(), n = null;
  }, u = async (p, E) => {
    t(), e.value = ie(p);
    const Z = i, N = We(p, E);
    n = N, s = N.subscribe((K) => {
      n === N && i === Z && (e.value = K);
    }), await N.start();
  }, $ = async () => {
    await (n == null ? void 0 : n.refresh());
  }, v = async (p, E) => {
    if (!n) throw new Error("Conversation controller is not connected.");
    return n.submitUserMessage(p, E);
  }, y = async (p, E) => {
    if (!n) throw new Error("Conversation controller is not connected.");
    return n.retryFailedUserMessage(p, E);
  }, m = (p) => n == null ? void 0 : n.discardFailedUserMessage(p), o = async () => {
    if (!n) throw new Error("Conversation controller is not connected.");
    await n.interrupt();
  }, T = (p = "") => {
    t(), e.value = ie(p);
  }, w = () => {
    t();
  };
  return Ue() && Ie(w), {
    state: O(() => e.value),
    connect: u,
    submitUserMessage: v,
    retryFailedUserMessage: y,
    discardFailedUserMessage: m,
    interrupt: o,
    refresh: $,
    reset: T,
    dispose: w
  };
}
export {
  ko as CodyComposer,
  yo as CodyConversation,
  Se as CodyImagePreviewDialog,
  be as CodyMarkdown,
  ft as CodyRequestCard,
  te as DEFAULT_CODY_MARKDOWN_LABELS,
  vo as conversationEntriesFromState,
  xe as questionFieldsFromParams,
  ye as renderCodyMarkdown,
  Ye as requestSummary,
  ke as stabilizeStreamingMarkdown,
  bo as useConversationController
};
