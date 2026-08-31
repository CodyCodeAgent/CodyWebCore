import { defineComponent as G, computed as O, ref as z, watch as ae, onMounted as be, onBeforeUnmount as he, openBlock as r, createElementBlock as d, Fragment as T, createElementVNode as p, nextTick as fe, reactive as $e, toDisplayString as $, renderList as E, createCommentVNode as q, createTextVNode as ne, normalizeClass as le, withDirectives as we, withKeys as Se, vModelDynamic as Ce, renderSlot as W, createVNode as H, unref as B, h as oe, useId as xe, withModifiers as ie, createBlock as re, shallowRef as Ae, getCurrentScope as qe, onScopeDispose as Me } from "vue";
import { buildApprovalRiskSummary as Le, toolStatusTone as de, buildToolOutputPreview as Te, isToolOutputTruncated as De, toolOutputToggleLabel as Re } from "@codycodeagent/cody-web-core/presentation";
import ve from "dompurify";
import _e from "markdown-it";
import Oe from "markdown-it-footnote";
import Ue from "markdown-it-task-lists";
import { conversationFeedFromState as Be, formatTurnDuration as Ee, createConversationState as se } from "@codycodeagent/cody-web-core/conversation";
import { composerHasContent as Ie, removeComposerTrigger as ze, findComposerTrigger as Pe } from "@codycodeagent/cody-web-core/composer";
import { createConversationController as je } from "@codycodeagent/cody-web-core/client";
const X = {
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
}, R = new _e({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
R.use(Ue, { enabled: !1, label: !0, labelAfter: !0 });
R.use(Oe);
function U(t, n) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${t}" aria-label="${n}" title="${n}">${n}</button>`;
}
function ke(t, n = "", i = X) {
  const u = n.toLowerCase();
  if (u === "mermaid" || u === "plantuml" || u === "puml") {
    const L = u === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${L}"><header class="markdown-diagram-toolbar"><span>${L}</span><span class="markdown-diagram-actions">${U("diagram-zoom-out", i.zoomOut)}${U("diagram-fit", i.fit)}${U("diagram-zoom-in", i.zoomIn)}${U("diagram-source", i.source)}${U("diagram-fullscreen", i.fullscreen)}${U("diagram-export-svg", "SVG")}${U("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${i.diagramAria(L)}"><p class="markdown-diagram-status">${i.rendering(L)}</p></div><pre class="markdown-diagram-source" hidden><code>${R.utils.escapeHtml(t)}</code></pre></div>
`;
  }
  const e = t.replace(/\n$/u, "").split(`
`), m = e.length <= 2 && e.every((L) => L.length <= 96), b = e.length > 10, g = n || "text", v = [m ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(n) ? `language-${n}` : ""].filter(Boolean).join(" "), s = v ? ` class="${v}"` : "", S = [m ? "is-compact" : "", b ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), w = b ? `${g} · ${i.lineCount(e.length)}` : g, c = b ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${i.collapseCode}" title="${i.collapseCode}" aria-expanded="false">${i.collapseCode}</button>` : "", C = b ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${i.expandCode(e.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${S ? ` ${S}` : ""}" data-language="${g}" data-code-lines="${String(e.length)}"><header class="markdown-code-toolbar"><span>${w}</span><span class="markdown-code-actions">${c}${U("wrap-code", i.wrap)}${U("copy-code", i.copy)}${U("save-code", i.save)}</span></header><pre class="markdown-code-block${m ? " is-compact" : ""}"><code${s}>${R.utils.escapeHtml(t)}</code></pre>${C}</div></div>
`;
}
R.renderer.rules.fence = (t, n, i, u) => {
  const e = t[n];
  return ke(e.content, e.info.trim().split(/\s+/u)[0] ?? "", u.labels);
};
R.renderer.rules.code_block = (t, n, i, u) => ke(t[n].content, "", u.labels);
R.renderer.rules.table_open = (t, n, i, u) => {
  const e = u.labels ?? X;
  return `<section class="markdown-table-shell" role="region" aria-label="${e.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${U("copy-table", e.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
R.renderer.rules.table_close = () => `</table></div></section>
`;
const ue = R.renderer.rules.code_inline;
R.renderer.rules.code_inline = (t, n, i, u, e) => {
  const m = t[n].content, b = m.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!b || /\s/u.test(m)) return ue ? ue(t, n, i, u, e) : e.renderToken(t, n, i);
  const g = R.utils.escapeHtml(b[1]), v = b[2] ?? "", s = u.labels ?? X;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${g}" data-file-line="${v}" title="${s.openFile(g)}"><code>${R.utils.escapeHtml(m)}</code></button>`;
};
const ce = R.renderer.rules.link_open;
R.renderer.rules.link_open = (t, n, i, u, e) => {
  const m = t[n];
  return /^https?:\/\//u.test(m.attrGet("href") ?? "") && (m.attrSet("target", "_blank"), m.attrSet("rel", "noopener noreferrer")), ce ? ce(t, n, i, u, e) : e.renderToken(t, n, i);
};
function me(t, n = X) {
  return ve.sanitize(R.render(t, { labels: n }), {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"]
  });
}
function pe(t) {
  var n;
  return (((n = t.match(/^\s*```/gmu)) == null ? void 0 : n.length) ?? 0) % 2 === 1 ? `${t}

\`\`\`` : t;
}
const Fe = ["innerHTML"], Ve = ["src"], ge = /* @__PURE__ */ G({
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
    const i = t, u = n, e = O(() => i.labels ?? X), m = z(null), b = z(null), g = z(me(pe(i.text), e.value)), v = z(""), s = /* @__PURE__ */ new Set();
    let S = 0, w = 0;
    const c = {
      javascript: () => import("highlight.js/lib/languages/javascript"),
      typescript: () => import("highlight.js/lib/languages/typescript"),
      python: () => import("highlight.js/lib/languages/python"),
      go: () => import("highlight.js/lib/languages/go"),
      rust: () => import("highlight.js/lib/languages/rust"),
      json: () => import("highlight.js/lib/languages/json"),
      bash: () => import("highlight.js/lib/languages/bash"),
      sql: () => import("highlight.js/lib/languages/sql")
    };
    async function C(f) {
      window.clearTimeout(S), S = window.setTimeout(async () => {
        g.value = me(pe(f), e.value), await fe(), L();
      }, i.renderDelay);
    }
    async function L() {
      var a, o, l, k, y, D;
      for (const x of Array.from(((a = m.value) == null ? void 0 : a.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((o = x.textContent) == null ? void 0 : o.trim()) ?? "") && (x.dataset.numeric = "true");
      for (const x of Array.from(((l = m.value) == null ? void 0 : l.querySelectorAll("img")) ?? []))
        x.addEventListener("error", () => {
          x.alt = x.alt || "图片加载失败", x.classList.add("is-load-error");
        }, { once: !0 });
      j();
      for (const [x, A] of Array.from(((k = m.value) == null ? void 0 : k.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        A.dataset.codeIndex = String(x), A.classList.contains("is-collapsible") && s.has(x) && A.classList.remove("is-collapsed");
        for (const M of Array.from(A.querySelectorAll('[data-markdown-action="toggle-code"]')))
          M.setAttribute("aria-expanded", String(!A.classList.contains("is-collapsed")));
        const _ = A.querySelector("pre"), P = A.querySelector('[data-markdown-action="wrap-code"]');
        _ && P && (P.hidden = _.scrollWidth <= _.clientWidth + 2, P.setAttribute("aria-pressed", String(A.classList.contains("is-wrapped"))));
      }
      await I();
      const f = Array.from(((y = m.value) == null ? void 0 : y.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (f.length === 0) return;
      const h = (await import("highlight.js/lib/core")).default;
      for (const x of f) {
        const A = ((D = Array.from(x.classList).find((M) => M.startsWith("language-"))) == null ? void 0 : D.slice(9)) ?? "", _ = c[A];
        if (!_ || x.dataset.highlighted === "yes") continue;
        const P = await _();
        h.getLanguage(A) || h.registerLanguage(A, P.default), x.innerHTML = h.highlight(x.textContent ?? "", { language: A }).value, x.dataset.highlighted = "yes";
      }
    }
    function j() {
      var h;
      if (!i.resolveAssetUrl) return;
      const f = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const a of Array.from(((h = m.value) == null ? void 0 : h.querySelectorAll("a[href]")) ?? [])) {
        const o = a.getAttribute("href") ?? "";
        if (!f.test(o) || /^(?:data|blob):/iu.test(o)) continue;
        const l = i.resolveAssetUrl(o);
        l && (a.href = l, a.target = "_blank", a.rel = "noopener noreferrer");
      }
    }
    async function I() {
      var h, a, o, l;
      const f = Array.from(((h = m.value) == null ? void 0 : h.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const k of f) {
        k.dataset.rendered = "loading";
        const y = k.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", D = ((a = k.querySelector("code")) == null ? void 0 : a.textContent) ?? "", x = k.querySelector(".markdown-diagram-stage");
        if (x)
          try {
            let A = await ((o = i.renderDiagram) == null ? void 0 : o.call(i, { engine: y, source: D, dark: i.dark }));
            if (!A && y === "mermaid") {
              const { default: _ } = await import("mermaid");
              _.initialize({ startOnLoad: !1, securityLevel: "strict", theme: i.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), A = (await _.render(`cody-diagram-${String(++w)}`, D)).svg;
            }
            if (!A) throw new Error(y === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            x.innerHTML = F(A), J(x), k.dataset.rendered = "yes", k.style.setProperty("--diagram-scale", "1");
          } catch (A) {
            x.textContent = A instanceof Error ? A.message : "图表渲染失败", x.classList.add("markdown-diagram-error"), (l = k.querySelector(".markdown-diagram-source")) == null || l.removeAttribute("hidden"), k.dataset.rendered = "error";
          }
      }
    }
    function F(f) {
      const h = ve.sanitize(f, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), a = h.trimStart().startsWith("<svg") ? h : `<svg xmlns="http://www.w3.org/2000/svg">${h}</svg>`, o = new DOMParser().parseFromString(a, "image/svg+xml");
      if (o.querySelector("parsererror")) return "";
      for (const l of o.querySelectorAll("*")) for (const k of Array.from(l.attributes)) /^on/iu.test(k.name) && l.removeAttribute(k.name);
      return o.querySelectorAll("script").forEach((l) => l.remove()), new XMLSerializer().serializeToString(o.documentElement);
    }
    function J(f) {
      if (f.dataset.panReady === "true") return;
      f.dataset.panReady = "true";
      let h = 0, a = 0, o = 0, l = 0;
      f.addEventListener("pointerdown", (y) => {
        y.button === 0 && (h = y.clientX, a = y.clientY, o = f.scrollLeft, l = f.scrollTop, f.setPointerCapture(y.pointerId), f.classList.add("is-panning"));
      }), f.addEventListener("pointermove", (y) => {
        f.hasPointerCapture(y.pointerId) && (f.scrollLeft = o - (y.clientX - h), f.scrollTop = l - (y.clientY - a));
      });
      const k = (y) => {
        f.hasPointerCapture(y.pointerId) && f.releasePointerCapture(y.pointerId), f.classList.remove("is-panning");
      };
      f.addEventListener("pointerup", k), f.addEventListener("pointercancel", k);
    }
    function V(f, h = 0) {
      const a = Number(f.style.getPropertyValue("--diagram-scale") || "1");
      f.style.setProperty("--diagram-scale", String(h === 0 ? 1 : Math.min(2.5, Math.max(0.4, a + h))));
    }
    function Q(f, h) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(f), a.download = h, a.click(), URL.revokeObjectURL(a.href);
    }
    async function Y(f, h) {
      const a = h.textContent;
      try {
        await navigator.clipboard.writeText(f), h.textContent = "已复制";
      } catch {
        const o = document.createElement("textarea");
        o.value = f, o.style.position = "fixed", o.style.opacity = "0", document.body.appendChild(o), o.select();
        const l = document.execCommand("copy");
        o.remove(), h.textContent = l ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        h.textContent = a;
      }, 1200);
    }
    function Z(f) {
      return Array.from((f == null ? void 0 : f.rows) ?? []).map((h) => Array.from(h.cells).map((a) => {
        var o;
        return `"${((o = a.textContent) == null ? void 0 : o.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function ee(f) {
      var D, x, A, _, P;
      const h = f.target, a = h.closest("img");
      if (a) {
        v.value = a.currentSrc || a.src, (D = b.value) == null || D.showModal();
        return;
      }
      const o = h.closest("[data-markdown-action]");
      if (!o) return;
      const l = o.closest(".markdown-code-shell, .markdown-table-shell"), k = o.dataset.markdownAction;
      if (k === "copy-code" && Y(((x = l == null ? void 0 : l.querySelector("code")) == null ? void 0 : x.textContent) ?? "", o), k === "wrap-code") {
        const M = (l == null ? void 0 : l.classList.toggle("is-wrapped")) ?? !1;
        o.textContent = M && e.value.scroll || e.value.wrap, o.setAttribute("aria-pressed", String(M));
      }
      if (k === "save-code" && Q(new Blob([((A = l == null ? void 0 : l.querySelector("code")) == null ? void 0 : A.textContent) ?? ""], { type: "text/plain" }), `snippet.${(l == null ? void 0 : l.dataset.language) || "txt"}`), k === "toggle-code" && (l != null && l.classList.contains("is-collapsible"))) {
        const M = Number(l.dataset.codeIndex ?? -1), N = !l.classList.toggle("is-collapsed");
        M >= 0 && (N ? s.add(M) : s.delete(M));
        for (const te of Array.from(l.querySelectorAll('[data-markdown-action="toggle-code"]'))) te.setAttribute("aria-expanded", String(N));
      }
      if (k === "copy-table" && Y(Z((l == null ? void 0 : l.querySelector("table")) ?? null), o), k === "open-file") {
        const M = o.dataset.filePath ?? "", N = ((_ = i.cwd) == null ? void 0 : _.replace(/\/$/u, "")) ?? "", te = M.startsWith("/") && N && M.startsWith(`${N}/`) ? M.slice(N.length + 1) : M.replace(/^\.\//u, "");
        u("openFile", { path: te, line: Number(o.dataset.fileLine || 0) || 1 });
      }
      const y = o.closest(".markdown-diagram-shell");
      if (y && k === "diagram-zoom-in" && V(y, 0.2), y && k === "diagram-zoom-out" && V(y, -0.2), y && k === "diagram-fit" && V(y), y && k === "diagram-source") {
        const M = y.querySelector(".markdown-diagram-source");
        M && (M.hidden = !M.hidden);
      }
      if (y && k === "diagram-fullscreen" && ((P = y.requestFullscreen) == null || P.call(y)), y && k === "diagram-export-svg") {
        const M = y.querySelector("svg");
        M && Q(new Blob([new XMLSerializer().serializeToString(M)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    function K() {
      var f;
      (f = b.value) == null || f.close();
    }
    return ae(() => [i.text, i.labels], ([f]) => {
      C(f);
    }, { deep: !0 }), be(() => {
      L();
    }), he(() => window.clearTimeout(S)), (f, h) => (r(), d(T, null, [
      p("div", {
        ref_key: "rootRef",
        ref: m,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: g.value,
        onClick: ee
      }, null, 8, Fe),
      p("dialog", {
        ref_key: "imageDialogRef",
        ref: b,
        class: "cody-markdown-image-dialog",
        onClick: K
      }, [
        p("button", {
          type: "button",
          "aria-label": "关闭图片预览",
          onClick: K
        }, "×"),
        p("img", {
          src: v.value,
          alt: "Markdown 图片预览"
        }, null, 8, Ve)
      ], 512)
    ], 64));
  }
});
function ye(t) {
  if (!t || typeof t != "object") return [];
  const n = t;
  return (Array.isArray(n.questions) ? n.questions : []).flatMap((u, e) => {
    if (!u || typeof u != "object") return [];
    const m = u, b = typeof m.question == "string" ? m.question.trim() : "";
    if (!b) return [];
    const g = Array.isArray(m.options) ? m.options : [];
    return [{
      id: typeof m.id == "string" && m.id.trim() ? m.id.trim() : `question-${String(e + 1)}`,
      header: typeof m.header == "string" ? m.header.trim() : "",
      question: b,
      isOther: m.isOther === !0,
      isSecret: m.isSecret === !0,
      options: g.flatMap((v) => {
        if (!v || typeof v != "object") return [];
        const s = v, S = typeof s.label == "string" ? s.label.trim() : "";
        return S ? [{ label: S, description: typeof s.description == "string" ? s.description.trim() : "" }] : [];
      })
    }];
  });
}
function Ne(t) {
  var u;
  if (!t || typeof t != "object") return "Codex 请求执行一项受保护操作。";
  const n = t, i = n.reason ?? n.question ?? n.command;
  return typeof i == "string" && i.trim() ? i : ((u = ye(t)[0]) == null ? void 0 : u.question) ?? "Codex 请求执行一项受保护操作。";
}
function eo(t) {
  var u;
  const n = [], i = (e) => {
    if (e.kind === "reasoning") {
      n.push({ id: e.id, kind: "reasoning", text: e.text });
      return;
    }
    if (!e.tool.summary && e.tool.details.length === 0 && !e.tool.output && e.tool.kind !== "fileChange") return;
    if (e.tool.kind !== "fileChange") {
      n.push({ id: e.id, kind: "tool", tool: e.tool });
      return;
    }
    const m = `file-group:${e.turnId ?? e.id}`, b = n.at(-1);
    if (!b || b.kind !== "tool" || b.id !== m) {
      const s = [...new Set(e.tool.details)], S = {
        id: m,
        kind: "tool",
        tool: {
          ...e.tool,
          title: s.length > 1 ? `文件变更 · ${String(s.length)} 个文件` : "文件变更",
          summary: s.length ? `${String(s.length)} 个文件已更新` : e.tool.summary,
          details: s
        }
      };
      n.push(S);
      return;
    }
    const g = [.../* @__PURE__ */ new Set([...b.tool.details, ...e.tool.details])], v = [b.tool.output, e.tool.output].filter(Boolean).join(`

`);
    b.tool = {
      ...b.tool,
      status: /fail|error|cancel|reject/iu.test(`${b.tool.status} ${e.tool.status}`) ? "failed" : e.tool.status,
      title: g.length > 1 ? `文件变更 · ${String(g.length)} 个文件` : "文件变更",
      summary: g.length ? `${String(g.length)} 个文件已更新` : e.tool.summary,
      details: g,
      ...v ? { output: v } : {}
    };
  };
  for (const e of Be(t))
    e.kind === "message" ? n.push({ id: e.id, kind: "message", message: e.message }) : e.kind === "timeline" ? i(e.entry) : e.kind === "plan" ? n.push({ id: e.id, kind: "plan", text: e.plan.text }) : e.kind === "request" ? n.push({ id: e.id, kind: "request", request: e.request }) : e.kind === "turn" && e.status === "failed" ? n.push({ id: e.id, kind: "failure", text: e.error }) : e.kind === "turn" && e.status === "interrupted" ? n.push({ id: e.id, kind: "interrupted", text: "本次回复已停止" }) : e.kind === "turn" && e.status === "completed" ? n.push({ id: e.id, kind: "worked", label: `Worked for ${Ee(e.durationMs ?? 0)}` }) : e.kind === "activity" && n.push({
      id: e.id,
      kind: "activity",
      title: e.status === "waiting" ? ((u = t.pendingRequests.find((m) => !m.turnId || m.turnId === e.turnId)) == null ? void 0 : u.kind) === "approval" ? "等待你的审批" : "等待你的回答" : e.label,
      detail: e.status === "waiting" ? "处理后 Codex 会继续本次回复" : e.status === "retrying" ? t.connection.status === "disconnected" ? "连接已中断，等待恢复" : "正在恢复本次回复" : t.connection.status === "connected" ? "实时更新中" : "等待恢复连接",
      tone: e.status
    });
  return n;
}
const He = ["data-kind"], Qe = { class: "cody-request-heading" }, Ke = { key: 0 }, We = {
  key: 0,
  class: "cody-question-options"
}, Ge = ["onClick"], Xe = { key: 0 }, Ye = ["onUpdate:modelValue", "type", "placeholder"], Ze = { class: "cody-request-actions" }, Je = ["disabled"], et = { class: "cody-approval-risk-heading" }, tt = ["data-level"], ot = { class: "cody-approval-risk-subject" }, st = {
  key: 0,
  class: "cody-approval-risk-labels"
}, at = {
  key: 1,
  class: "cody-approval-risk-details"
}, nt = { class: "cody-approval-risk-recommendation" }, lt = { key: 1 }, it = {
  key: 2,
  class: "cody-request-actions"
}, rt = /* @__PURE__ */ G({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(t, { emit: n }) {
    const i = t, u = n, e = $e({}), m = O(() => ye(i.request.params)), b = O(() => Ne(i.request.params)), g = O(() => i.request.kind === "approval" ? Le({ method: i.request.method, params: i.request.params }) : null), v = O(() => m.value.length > 0 && m.value.every((S) => {
      var w;
      return !!((w = e[S.id]) != null && w.trim());
    }));
    ae(() => i.request.id, () => {
      for (const S of Object.keys(e)) delete e[S];
    });
    function s() {
      v.value && u("resolveQuestion", i.request.id, Object.fromEntries(m.value.map((S) => [S.id, { answers: [e[S.id].trim()] }])));
    }
    return (S, w) => (r(), d("article", {
      class: "cody-request-card",
      "data-kind": t.request.kind
    }, [
      p("div", Qe, [
        p("strong", null, $(t.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        w[2] || (w[2] = p("small", null, "Agent 已暂停等待", -1))
      ]),
      t.request.kind === "question" && m.value.length ? (r(), d(T, { key: 0 }, [
        (r(!0), d(T, null, E(m.value, (c) => (r(), d("fieldset", {
          key: c.id,
          class: "cody-question-field"
        }, [
          p("legend", null, [
            c.header ? (r(), d("span", Ke, $(c.header), 1)) : q("", !0),
            ne($(c.question), 1)
          ]),
          c.options.length ? (r(), d("div", We, [
            (r(!0), d(T, null, E(c.options, (C) => (r(), d("button", {
              key: C.label,
              type: "button",
              class: le({ selected: e[c.id] === C.label }),
              onClick: (L) => e[c.id] = C.label
            }, [
              p("strong", null, $(C.label), 1),
              C.description ? (r(), d("small", Xe, $(C.description), 1)) : q("", !0)
            ], 10, Ge))), 128))
          ])) : q("", !0),
          c.options.length === 0 || c.isOther ? we((r(), d("input", {
            key: 1,
            "onUpdate:modelValue": (C) => e[c.id] = C,
            type: c.isSecret ? "password" : "text",
            placeholder: c.options.length ? "其他回答…" : "输入回答…",
            onKeyup: Se(s, ["enter"])
          }, null, 40, Ye)), [
            [Ce, e[c.id]]
          ]) : q("", !0)
        ]))), 128)),
        p("div", Ze, [
          p("button", {
            type: "button",
            disabled: !v.value,
            onClick: s
          }, "提交回答", 8, Je)
        ])
      ], 64)) : (r(), d(T, { key: 1 }, [
        g.value ? (r(), d(T, { key: 0 }, [
          p("div", et, [
            p("div", null, [
              p("strong", null, $(g.value.title), 1),
              p("p", null, $(g.value.description), 1)
            ]),
            p("span", {
              class: "cody-approval-risk-level",
              "data-level": g.value.level
            }, $(g.value.level), 9, tt)
          ]),
          p("code", ot, $(g.value.subject), 1),
          g.value.riskLabels.length ? (r(), d("ul", st, [
            (r(!0), d(T, null, E(g.value.riskLabels, (c) => (r(), d("li", { key: c }, $(c), 1))), 128))
          ])) : q("", !0),
          g.value.impacts.length ? (r(), d("details", at, [
            w[3] || (w[3] = p("summary", null, "查看影响", -1)),
            p("ul", null, [
              (r(!0), d(T, null, E(g.value.impacts, (c) => (r(), d("li", { key: c }, $(c), 1))), 128))
            ])
          ])) : q("", !0),
          p("p", nt, $(g.value.recommendation), 1)
        ], 64)) : (r(), d("p", lt, $(b.value), 1)),
        t.request.kind === "approval" ? (r(), d("div", it, [
          p("button", {
            type: "button",
            onClick: w[0] || (w[0] = (c) => u("resolveApproval", t.request.id, "accept"))
          }, "允许一次"),
          p("button", {
            type: "button",
            "data-tone": "danger",
            onClick: w[1] || (w[1] = (c) => u("resolveApproval", t.request.id, "decline"))
          }, "拒绝")
        ])) : q("", !0)
      ], 64))
    ], 8, He));
  }
}), dt = ["data-variant"], ut = {
  key: 0,
  class: "cody-conversation-loading",
  role: "status"
}, ct = {
  key: 1,
  class: "cody-conversation-empty"
}, mt = {
  key: 0,
  class: "cody-worked-divider"
}, pt = ["data-role"], gt = ["data-role"], ft = { class: "cody-message-stack" }, vt = { class: "cody-message-label" }, kt = {
  key: 0,
  class: "cody-message-skills"
}, yt = {
  key: 1,
  class: "cody-message-body"
}, bt = {
  key: 2,
  class: "cody-message-images"
}, ht = ["src"], $t = ["onClick"], wt = ["data-tone", "open"], St = { key: 0 }, Ct = ["onClick"], xt = {
  key: 3,
  class: "cody-reasoning-card"
}, At = {
  key: 4,
  class: "cody-plan-card",
  open: ""
}, qt = {
  key: 6,
  class: "cody-failure-card"
}, Mt = {
  key: 7,
  class: "cody-interrupted-card",
  role: "status"
}, Lt = ["data-tone"], to = /* @__PURE__ */ G({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "resolveApproval", "resolveQuestion"],
  setup(t, { emit: n }) {
    const i = n, u = z({});
    function e(g) {
      u.value = {
        ...u.value,
        [g]: u.value[g] !== !0
      };
    }
    function m(g, v) {
      i("resolveApproval", g, v);
    }
    function b(g, v) {
      i("resolveQuestion", g, v);
    }
    return (g, v) => (r(), d("section", {
      class: "cody-conversation",
      "data-variant": t.variant,
      "data-cody-component": "conversation-surface"
    }, [
      t.loading ? (r(), d("div", ut, "正在同步对话…")) : t.entries.length === 0 ? (r(), d("div", ct, [
        W(g.$slots, "empty", {}, () => [
          v[2] || (v[2] = ne("开始这个需求的开发", -1))
        ])
      ])) : (r(!0), d(T, { key: 2 }, E(t.entries, (s) => {
        var S, w;
        return r(), d(T, {
          key: s.id
        }, [
          s.kind === "worked" ? (r(), d("div", mt, [
            p("span", null, $(s.label), 1)
          ])) : s.kind === "message" ? (r(), d("article", {
            key: 1,
            class: "cody-message",
            "data-role": s.message.role
          }, [
            p("div", {
              class: "cody-message-identity",
              "data-role": s.message.role
            }, $(s.message.role === "user" ? "你" : "CW"), 9, gt),
            p("div", ft, [
              p("div", vt, $(s.message.role === "user" ? "你" : s.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (S = s.message.skills) != null && S.length ? (r(), d("ul", kt, [
                (r(!0), d(T, null, E(s.message.skills, (c) => (r(), d("li", {
                  key: `${c.name}:${c.path}`
                }, "$" + $(c.displayName || c.name), 1))), 128))
              ])) : q("", !0),
              s.message.text ? (r(), d("div", yt, [
                W(g.$slots, "markdown", {
                  message: s.message
                }, () => [
                  H(ge, {
                    text: s.message.text,
                    onOpenFile: v[0] || (v[0] = (c) => i("openFile", c))
                  }, null, 8, ["text"])
                ])
              ])) : q("", !0),
              (w = s.message.images) != null && w.length ? (r(), d("div", bt, [
                (r(!0), d(T, null, E(s.message.images, (c) => (r(), d("img", {
                  key: c,
                  src: c,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, ht))), 128))
              ])) : q("", !0),
              s.message.outbox ? (r(), d("p", {
                key: 3,
                class: le(["cody-message-outbox", s.message.outbox.status]),
                role: "status"
              }, $(s.message.outbox.status === "failed" ? `发送失败${s.message.outbox.lastError ? `：${s.message.outbox.lastError}` : ""}` : s.message.outbox.status === "queued" ? "已加入发送队列" : "正在发送…"), 3)) : q("", !0),
              s.message.text ? (r(), d("button", {
                key: 4,
                class: "cody-copy-button",
                type: "button",
                onClick: (c) => i("copy", s.message.text)
              }, "复制", 8, $t)) : q("", !0)
            ])
          ], 8, pt)) : s.kind === "tool" ? (r(), d("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": B(de)(s.tool.status),
            open: B(de)(s.tool.status) === "working"
          }, [
            p("summary", null, [
              v[3] || (v[3] = p("span", null, "⌁", -1)),
              p("strong", null, $(s.tool.title), 1),
              p("small", null, $(s.tool.status), 1)
            ]),
            p("p", null, $(s.tool.summary), 1),
            s.tool.details.length ? (r(), d("ul", St, [
              (r(!0), d(T, null, E(s.tool.details, (c) => (r(), d("li", { key: c }, $(c), 1))), 128))
            ])) : q("", !0),
            s.tool.output ? (r(), d(T, { key: 1 }, [
              p("pre", null, $(u.value[s.id] ? s.tool.output : B(Te)(s.tool.output)), 1),
              B(De)(s.tool.output) ? (r(), d("button", {
                key: 0,
                class: "cody-tool-output-toggle",
                type: "button",
                onClick: (c) => e(s.id)
              }, $(B(Re)(u.value[s.id] === !0)), 9, Ct)) : q("", !0)
            ], 64)) : q("", !0)
          ], 8, wt)) : s.kind === "reasoning" ? (r(), d("details", xt, [
            p("summary", null, "✦ " + $(s.title || "推理过程"), 1),
            p("pre", null, $(s.text), 1)
          ])) : s.kind === "plan" ? (r(), d("details", At, [
            v[4] || (v[4] = p("summary", null, "计划", -1)),
            H(ge, {
              text: s.text,
              onOpenFile: v[1] || (v[1] = (c) => i("openFile", c))
            }, null, 8, ["text"])
          ])) : s.kind === "request" ? W(g.$slots, "request", {
            request: s.request
          }, () => [
            H(rt, {
              request: s.request,
              onResolveApproval: m,
              onResolveQuestion: b
            }, null, 8, ["request"])
          ], void 0, 5) : s.kind === "failure" ? (r(), d("details", qt, [
            v[5] || (v[5] = p("summary", null, "本次回复失败", -1)),
            p("p", null, $(s.text), 1)
          ])) : s.kind === "interrupted" ? (r(), d("article", Mt, $(s.text), 1)) : s.kind === "activity" ? (r(), d("article", {
            key: 8,
            class: "cody-conversation-activity",
            "data-tone": s.tone,
            role: "status",
            "aria-live": "polite"
          }, [
            v[6] || (v[6] = p("span", {
              class: "cody-activity-pulse",
              "aria-hidden": "true"
            }, null, -1)),
            p("strong", null, $(s.title), 1),
            p("small", null, $(s.detail), 1)
          ], 8, Lt)) : q("", !0)
        ], 64);
      }), 128))
    ], 8, dt));
  }
}), Tt = ["data-variant"], Dt = { class: "cody-composer-shell" }, Rt = {
  key: 0,
  class: "cody-composer-selected",
  "aria-label": "已引用 Skills"
}, _t = ["disabled", "aria-label", "onClick"], Ot = ["value", "disabled", "placeholder", "aria-expanded", "aria-controls", "aria-activedescendant"], Ut = {
  key: 0,
  class: "cody-composer-skill-status"
}, Bt = ["id", "aria-selected", "onMouseenter", "onMousedown"], Et = { class: "cody-composer-skill-option-name" }, It = {
  key: 0,
  class: "cody-composer-skill-option-description"
}, zt = { class: "cody-composer-controls" }, Pt = {
  class: "cody-composer-settings",
  "aria-label": "运行设置"
}, jt = { class: "cody-composer-actions" }, Ft = ["disabled"], Vt = ["disabled", "aria-label", "title"], Nt = {
  key: 2,
  class: "cody-composer-policy"
}, oo = /* @__PURE__ */ G({
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
    const i = G({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(a, { emit: o }) {
        return () => oe("label", { class: "cody-composer-compact-control", title: a.label, "data-control": a.label }, [
          oe("select", { value: a.modelValue, disabled: a.disabled, "aria-label": a.label, onChange: (l) => o("update:modelValue", l.target.value) }, a.options.map((l) => oe("option", { value: l.value }, l.label)))
        ]);
      }
    }), u = t, e = n, m = z(null), b = z(u.draft), g = z(null), v = z(0), s = xe(), S = `${s}-skill-menu`, w = O(() => {
      const a = g.value;
      return a ? u.skills.filter((o) => !u.selectedSkills.includes(o.value)).filter((o) => a.query ? `${o.label}
${o.description ?? ""}`.toLowerCase().includes(a.query) : !0).slice(0, 8) : [];
    }), c = O(() => g.value !== null), C = O(() => c.value && w.value.length ? V(Math.min(v.value, w.value.length - 1)) : void 0), L = O(() => {
      var a;
      return ((a = u.permissionOptions.find((o) => o.value === u.selectedPermission)) == null ? void 0 : a.description) ?? "";
    }), j = O(() => !u.disabled && Ie({ text: u.draft, skills: u.selectedSkills })), I = O(() => u.isRunning && u.selectedSubmitMode === "steer" ? "发送引导" : u.isRunning ? "加入队列" : "发送");
    ae(() => u.draft, (a) => {
      b.value = a;
    });
    function F(a, o) {
      var l;
      return ((l = a.find((k) => k.value === o)) == null ? void 0 : l.label) ?? o;
    }
    function J(a) {
      e("update:selected-skills", u.selectedSkills.filter((o) => o !== a));
    }
    function V(a) {
      return `${s}-skill-option-${String(a)}`;
    }
    function Q(a, o) {
      g.value = Pe(a, o, "$"), v.value = 0;
    }
    function Y(a) {
      const o = a.target;
      b.value = o.value, e("update:draft", o.value), Q(o.value, o.selectionStart);
    }
    function Z(a) {
      const o = a.target;
      Q(o.value, o.selectionStart);
    }
    function ee() {
      window.setTimeout(() => {
        g.value = null;
      }, 0);
    }
    function K(a) {
      const o = g.value;
      if (!o) return;
      const l = m.value, k = (l == null ? void 0 : l.value) || b.value, y = ze(k, o);
      u.selectedSkills.includes(a) || e("update:selected-skills", [...u.selectedSkills, a]), e("update:draft", y.text), b.value = y.text, g.value = null, fe(() => {
        const D = m.value;
        D == null || D.focus(), D == null || D.setSelectionRange(y.cursor, y.cursor);
      });
    }
    function f(a) {
      if (c.value) {
        if (a.key === "Escape") {
          a.preventDefault(), g.value = null;
          return;
        }
        if (a.key === "ArrowDown" || a.key === "ArrowUp") {
          a.preventDefault();
          const o = w.value.length;
          o && (v.value = (v.value + (a.key === "ArrowDown" ? 1 : -1) + o) % o);
          return;
        }
        if (a.key === "Enter" && !a.ctrlKey && !a.metaKey && w.value.length) {
          a.preventDefault(), K(w.value[Math.min(v.value, w.value.length - 1)].value);
          return;
        }
      }
      a.key !== "Enter" || a.isComposing || !a.ctrlKey && !a.metaKey || (a.preventDefault(), h());
    }
    function h() {
      j.value && e("send");
    }
    return (a, o) => (r(), d("form", {
      class: "cody-composer",
      "data-variant": t.variant,
      "data-cody-component": "composer-surface",
      onSubmit: ie(h, ["prevent"])
    }, [
      p("div", Dt, [
        t.selectedSkills.length ? (r(), d("div", Rt, [
          (r(!0), d(T, null, E(t.selectedSkills, (l) => (r(), d("span", {
            key: l,
            class: "cody-composer-chip"
          }, [
            ne(" $" + $(F(t.skills, l)) + " ", 1),
            p("button", {
              type: "button",
              disabled: t.disabled,
              "aria-label": `移除 Skill ${F(t.skills, l)}`,
              onClick: (k) => J(l)
            }, "×", 8, _t)
          ]))), 128))
        ])) : q("", !0),
        p("textarea", {
          ref_key: "draftInputRef",
          ref: m,
          value: t.draft,
          rows: "1",
          disabled: t.disabled,
          placeholder: t.placeholder,
          "aria-expanded": c.value,
          "aria-controls": c.value ? S : void 0,
          "aria-activedescendant": C.value,
          "aria-autocomplete": "list",
          onInput: Y,
          onClick: Z,
          onKeyup: Z,
          onBlur: ee,
          onKeydown: f
        }, null, 40, Ot),
        c.value ? (r(), d("div", {
          key: 1,
          id: S,
          class: "cody-composer-skill-menu",
          role: "listbox",
          "aria-label": "可引用 Skills"
        }, [
          w.value.length === 0 ? (r(), d("p", Ut, "没有匹配的 Skill")) : (r(!0), d(T, { key: 1 }, E(w.value, (l, k) => (r(), d("button", {
            id: V(k),
            key: l.value,
            class: le(["cody-composer-skill-option", { active: k === v.value }]),
            type: "button",
            role: "option",
            "aria-selected": k === v.value,
            onMouseenter: (y) => v.value = k,
            onMousedown: ie((y) => K(l.value), ["prevent"])
          }, [
            p("span", Et, "$" + $(l.label), 1),
            l.description ? (r(), d("span", It, $(l.description), 1)) : q("", !0)
          ], 42, Bt))), 128))
        ])) : q("", !0),
        p("div", zt, [
          p("div", Pt, [
            W(a.$slots, "leading"),
            t.collaborationModes.length ? (r(), re(B(i), {
              key: 0,
              label: "协作模式",
              "model-value": t.selectedCollaborationMode,
              options: t.collaborationModes,
              disabled: t.disabled || t.isRunning,
              "onUpdate:modelValue": o[0] || (o[0] = (l) => e("update:collaboration-mode", l))
            }, null, 8, ["model-value", "options", "disabled"])) : q("", !0),
            H(B(i), {
              label: "提交策略",
              "model-value": t.selectedSubmitMode,
              options: t.submitModes,
              disabled: t.disabled,
              "onUpdate:modelValue": o[1] || (o[1] = (l) => e("update:submit-mode", l))
            }, null, 8, ["model-value", "options", "disabled"]),
            t.models.length ? (r(), re(B(i), {
              key: 1,
              label: "模型",
              "model-value": t.selectedModel,
              options: t.models,
              disabled: t.disabled || t.isRunning,
              "onUpdate:modelValue": o[2] || (o[2] = (l) => e("update:model", l))
            }, null, 8, ["model-value", "options", "disabled"])) : q("", !0),
            H(B(i), {
              label: "推理强度",
              "model-value": t.selectedReasoning,
              options: t.reasoningOptions,
              disabled: t.disabled || t.isRunning,
              "onUpdate:modelValue": o[3] || (o[3] = (l) => e("update:reasoning", l))
            }, null, 8, ["model-value", "options", "disabled"]),
            H(B(i), {
              label: "权限",
              "model-value": t.selectedPermission,
              options: t.permissionOptions,
              disabled: t.disabled || t.isRunning,
              "onUpdate:modelValue": o[4] || (o[4] = (l) => e("update:permission", l))
            }, null, 8, ["model-value", "options", "disabled"]),
            W(a.$slots, "controls")
          ]),
          p("div", jt, [
            t.isRunning ? (r(), d("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: t.disabled,
              "aria-label": "停止当前回复",
              title: "停止当前回复",
              onClick: o[5] || (o[5] = (l) => e("stop"))
            }, [...o[6] || (o[6] = [
              p("span", {
                class: "cody-composer-stop-icon",
                "aria-hidden": "true"
              }, null, -1)
            ])], 8, Ft)) : q("", !0),
            p("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: !j.value,
              "aria-label": I.value,
              title: I.value
            }, [...o[7] || (o[7] = [
              p("svg", {
                viewBox: "0 0 24 24",
                "aria-hidden": "true"
              }, [
                p("path", { d: "M12 19V5m0 0-6 6m6-6 6 6" })
              ], -1)
            ])], 8, Vt)
          ])
        ]),
        L.value ? (r(), d("p", Nt, $(L.value), 1)) : q("", !0)
      ])
    ], 40, Tt));
  }
});
function so() {
  const t = Ae(se());
  let n = null, i = null, u = 0;
  const e = () => {
    u += 1, i == null || i(), i = null, n == null || n.dispose(), n = null;
  }, m = async (C, L) => {
    e(), t.value = se(C);
    const j = u, I = je(C, L);
    n = I, i = I.subscribe((F) => {
      n === I && u === j && (t.value = F);
    }), await I.start();
  }, b = async () => {
    await (n == null ? void 0 : n.refresh());
  }, g = (C) => n == null ? void 0 : n.enqueueUserMessage(C), v = async (C, L) => {
    if (!n) throw new Error("Conversation controller is not connected.");
    return n.submitUserMessage(C, L);
  }, s = (C, L) => n == null ? void 0 : n.bindQueuedUserMessage(C, L), S = (C, L) => n == null ? void 0 : n.failQueuedUserMessage(C, L), w = (C = "") => {
    e(), t.value = se(C);
  }, c = () => {
    e();
  };
  return qe() && Me(c), {
    state: O(() => t.value),
    connect: m,
    enqueueUserMessage: g,
    submitUserMessage: v,
    bindQueuedUserMessage: s,
    failQueuedUserMessage: S,
    refresh: b,
    reset: w,
    dispose: c
  };
}
export {
  oo as CodyComposer,
  to as CodyConversation,
  ge as CodyMarkdown,
  rt as CodyRequestCard,
  X as DEFAULT_CODY_MARKDOWN_LABELS,
  eo as conversationEntriesFromState,
  ye as questionFieldsFromParams,
  me as renderCodyMarkdown,
  Ne as requestSummary,
  pe as stabilizeStreamingMarkdown,
  so as useConversationController
};
