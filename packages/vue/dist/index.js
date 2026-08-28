import { defineComponent as H, computed as N, ref as V, watch as pe, onMounted as fe, onBeforeUnmount as ge, openBlock as m, createElementBlock as g, Fragment as B, createElementVNode as y, nextTick as ke, renderSlot as E, createTextVNode as se, renderList as P, toDisplayString as A, createCommentVNode as T, createVNode as F, h as Y, withModifiers as J, withKeys as be, createBlock as Q, unref as j } from "vue";
import le from "dompurify";
import ye from "markdown-it";
import ve from "markdown-it-footnote";
import he from "markdown-it-task-lists";
const U = {
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
}, M = new ye({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
M.use(he, { enabled: !1, label: !0, labelAfter: !0 });
M.use(ve);
function D(e, s) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${e}" aria-label="${s}" title="${s}">${s}</button>`;
}
function ie(e, s = "", n = U) {
  const p = s.toLowerCase();
  if (p === "mermaid" || p === "plantuml" || p === "puml") {
    const L = p === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${L}"><header class="markdown-diagram-toolbar"><span>${L}</span><span class="markdown-diagram-actions">${D("diagram-zoom-out", n.zoomOut)}${D("diagram-fit", n.fit)}${D("diagram-zoom-in", n.zoomIn)}${D("diagram-source", n.source)}${D("diagram-fullscreen", n.fullscreen)}${D("diagram-export-svg", "SVG")}${D("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${n.diagramAria(L)}"><p class="markdown-diagram-status">${n.rendering(L)}</p></div><pre class="markdown-diagram-source" hidden><code>${M.utils.escapeHtml(e)}</code></pre></div>
`;
  }
  const r = e.replace(/\n$/u, "").split(`
`), v = r.length <= 2 && r.every((L) => L.length <= 96), k = r.length > 10, f = s || "text", a = [v ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(s) ? `language-${s}` : ""].filter(Boolean).join(" "), q = a ? ` class="${a}"` : "", t = [v ? "is-compact" : "", k ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), o = k ? `${f} · ${n.lineCount(r.length)}` : f, l = k ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${n.collapseCode}" title="${n.collapseCode}" aria-expanded="false">${n.collapseCode}</button>` : "", d = k ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${n.expandCode(r.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${t ? ` ${t}` : ""}" data-language="${f}" data-code-lines="${String(r.length)}"><header class="markdown-code-toolbar"><span>${o}</span><span class="markdown-code-actions">${l}${D("wrap-code", n.wrap)}${D("copy-code", n.copy)}${D("save-code", n.save)}</span></header><pre class="markdown-code-block${v ? " is-compact" : ""}"><code${q}>${M.utils.escapeHtml(e)}</code></pre>${d}</div></div>
`;
}
M.renderer.rules.fence = (e, s, n, p) => {
  const r = e[s];
  return ie(r.content, r.info.trim().split(/\s+/u)[0] ?? "", p.labels);
};
M.renderer.rules.code_block = (e, s, n, p) => ie(e[s].content, "", p.labels);
M.renderer.rules.table_open = (e, s, n, p) => {
  const r = p.labels ?? U;
  return `<section class="markdown-table-shell" role="region" aria-label="${r.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${D("copy-table", r.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
M.renderer.rules.table_close = () => `</table></div></section>
`;
const ee = M.renderer.rules.code_inline;
M.renderer.rules.code_inline = (e, s, n, p, r) => {
  const v = e[s].content, k = v.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!k || /\s/u.test(v)) return ee ? ee(e, s, n, p, r) : r.renderToken(e, s, n);
  const f = M.utils.escapeHtml(k[1]), a = k[2] ?? "", q = p.labels ?? U;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${f}" data-file-line="${a}" title="${q.openFile(f)}"><code>${M.utils.escapeHtml(v)}</code></button>`;
};
const te = M.renderer.rules.link_open;
M.renderer.rules.link_open = (e, s, n, p, r) => {
  const v = e[s];
  return /^https?:\/\//u.test(v.attrGet("href") ?? "") && (v.attrSet("target", "_blank"), v.attrSet("rel", "noopener noreferrer")), te ? te(e, s, n, p, r) : r.renderToken(e, s, n);
};
function oe(e, s = U) {
  return le.sanitize(M.render(e, { labels: s }), {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"]
  });
}
function ne(e) {
  var s;
  return (((s = e.match(/^\s*```/gmu)) == null ? void 0 : s.length) ?? 0) % 2 === 1 ? `${e}

\`\`\`` : e;
}
const $e = ["innerHTML"], we = ["src"], ae = /* @__PURE__ */ H({
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
    const n = e, p = s, r = N(() => n.labels ?? U), v = V(null), k = V(null), f = V(oe(ne(n.text), r.value)), a = V(""), q = /* @__PURE__ */ new Set();
    let t = 0, o = 0;
    const l = {
      javascript: () => import("highlight.js/lib/languages/javascript"),
      typescript: () => import("highlight.js/lib/languages/typescript"),
      python: () => import("highlight.js/lib/languages/python"),
      go: () => import("highlight.js/lib/languages/go"),
      rust: () => import("highlight.js/lib/languages/rust"),
      json: () => import("highlight.js/lib/languages/json"),
      bash: () => import("highlight.js/lib/languages/bash"),
      sql: () => import("highlight.js/lib/languages/sql")
    };
    async function d(i) {
      window.clearTimeout(t), t = window.setTimeout(async () => {
        f.value = oe(ne(i), r.value), await ke(), L();
      }, n.renderDelay);
    }
    async function L() {
      var $, u, c, w, b, R;
      for (const S of Array.from((($ = v.value) == null ? void 0 : $.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((u = S.textContent) == null ? void 0 : u.trim()) ?? "") && (S.dataset.numeric = "true");
      for (const S of Array.from(((c = v.value) == null ? void 0 : c.querySelectorAll("img")) ?? []))
        S.addEventListener("error", () => {
          S.alt = S.alt || "图片加载失败", S.classList.add("is-load-error");
        }, { once: !0 });
      W();
      for (const [S, C] of Array.from(((w = v.value) == null ? void 0 : w.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        C.dataset.codeIndex = String(S), C.classList.contains("is-collapsible") && q.has(S) && C.classList.remove("is-collapsed");
        for (const x of Array.from(C.querySelectorAll('[data-markdown-action="toggle-code"]')))
          x.setAttribute("aria-expanded", String(!C.classList.contains("is-collapsed")));
        const I = C.querySelector("pre"), z = C.querySelector('[data-markdown-action="wrap-code"]');
        I && z && (z.hidden = I.scrollWidth <= I.clientWidth + 2, z.setAttribute("aria-pressed", String(C.classList.contains("is-wrapped"))));
      }
      await re();
      const i = Array.from(((b = v.value) == null ? void 0 : b.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (i.length === 0) return;
      const h = (await import("highlight.js/lib/core")).default;
      for (const S of i) {
        const C = ((R = Array.from(S.classList).find((x) => x.startsWith("language-"))) == null ? void 0 : R.slice(9)) ?? "", I = l[C];
        if (!I || S.dataset.highlighted === "yes") continue;
        const z = await I();
        h.getLanguage(C) || h.registerLanguage(C, z.default), S.innerHTML = h.highlight(S.textContent ?? "", { language: C }).value, S.dataset.highlighted = "yes";
      }
    }
    function W() {
      var h;
      if (!n.resolveAssetUrl) return;
      const i = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const $ of Array.from(((h = v.value) == null ? void 0 : h.querySelectorAll("a[href]")) ?? [])) {
        const u = $.getAttribute("href") ?? "";
        if (!i.test(u) || /^(?:data|blob):/iu.test(u)) continue;
        const c = n.resolveAssetUrl(u);
        c && ($.href = c, $.target = "_blank", $.rel = "noopener noreferrer");
      }
    }
    async function re() {
      var h, $, u, c;
      const i = Array.from(((h = v.value) == null ? void 0 : h.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const w of i) {
        w.dataset.rendered = "loading";
        const b = w.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", R = (($ = w.querySelector("code")) == null ? void 0 : $.textContent) ?? "", S = w.querySelector(".markdown-diagram-stage");
        if (S)
          try {
            let C = await ((u = n.renderDiagram) == null ? void 0 : u.call(n, { engine: b, source: R, dark: n.dark }));
            if (!C && b === "mermaid") {
              const { default: I } = await import("mermaid");
              I.initialize({ startOnLoad: !1, securityLevel: "strict", theme: n.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), C = (await I.render(`cody-diagram-${String(++o)}`, R)).svg;
            }
            if (!C) throw new Error(b === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            S.innerHTML = de(C), ce(S), w.dataset.rendered = "yes", w.style.setProperty("--diagram-scale", "1");
          } catch (C) {
            S.textContent = C instanceof Error ? C.message : "图表渲染失败", S.classList.add("markdown-diagram-error"), (c = w.querySelector(".markdown-diagram-source")) == null || c.removeAttribute("hidden"), w.dataset.rendered = "error";
          }
      }
    }
    function de(i) {
      const h = le.sanitize(i, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), $ = h.trimStart().startsWith("<svg") ? h : `<svg xmlns="http://www.w3.org/2000/svg">${h}</svg>`, u = new DOMParser().parseFromString($, "image/svg+xml");
      if (u.querySelector("parsererror")) return "";
      for (const c of u.querySelectorAll("*")) for (const w of Array.from(c.attributes)) /^on/iu.test(w.name) && c.removeAttribute(w.name);
      return u.querySelectorAll("script").forEach((c) => c.remove()), new XMLSerializer().serializeToString(u.documentElement);
    }
    function ce(i) {
      if (i.dataset.panReady === "true") return;
      i.dataset.panReady = "true";
      let h = 0, $ = 0, u = 0, c = 0;
      i.addEventListener("pointerdown", (b) => {
        b.button === 0 && (h = b.clientX, $ = b.clientY, u = i.scrollLeft, c = i.scrollTop, i.setPointerCapture(b.pointerId), i.classList.add("is-panning"));
      }), i.addEventListener("pointermove", (b) => {
        i.hasPointerCapture(b.pointerId) && (i.scrollLeft = u - (b.clientX - h), i.scrollTop = c - (b.clientY - $));
      });
      const w = (b) => {
        i.hasPointerCapture(b.pointerId) && i.releasePointerCapture(b.pointerId), i.classList.remove("is-panning");
      };
      i.addEventListener("pointerup", w), i.addEventListener("pointercancel", w);
    }
    function G(i, h = 0) {
      const $ = Number(i.style.getPropertyValue("--diagram-scale") || "1");
      i.style.setProperty("--diagram-scale", String(h === 0 ? 1 : Math.min(2.5, Math.max(0.4, $ + h))));
    }
    function K(i, h) {
      const $ = document.createElement("a");
      $.href = URL.createObjectURL(i), $.download = h, $.click(), URL.revokeObjectURL($.href);
    }
    async function _(i, h) {
      const $ = h.textContent;
      try {
        await navigator.clipboard.writeText(i), h.textContent = "已复制";
      } catch {
        const u = document.createElement("textarea");
        u.value = i, u.style.position = "fixed", u.style.opacity = "0", document.body.appendChild(u), u.select();
        const c = document.execCommand("copy");
        u.remove(), h.textContent = c ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        h.textContent = $;
      }, 1200);
    }
    function ue(i) {
      return Array.from((i == null ? void 0 : i.rows) ?? []).map((h) => Array.from(h.cells).map(($) => {
        var u;
        return `"${((u = $.textContent) == null ? void 0 : u.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function me(i) {
      var R, S, C, I, z;
      const h = i.target, $ = h.closest("img");
      if ($) {
        a.value = $.currentSrc || $.src, (R = k.value) == null || R.showModal();
        return;
      }
      const u = h.closest("[data-markdown-action]");
      if (!u) return;
      const c = u.closest(".markdown-code-shell, .markdown-table-shell"), w = u.dataset.markdownAction;
      if (w === "copy-code" && _(((S = c == null ? void 0 : c.querySelector("code")) == null ? void 0 : S.textContent) ?? "", u), w === "wrap-code") {
        const x = (c == null ? void 0 : c.classList.toggle("is-wrapped")) ?? !1;
        u.textContent = x && r.value.scroll || r.value.wrap, u.setAttribute("aria-pressed", String(x));
      }
      if (w === "save-code" && K(new Blob([((C = c == null ? void 0 : c.querySelector("code")) == null ? void 0 : C.textContent) ?? ""], { type: "text/plain" }), `snippet.${(c == null ? void 0 : c.dataset.language) || "txt"}`), w === "toggle-code" && (c != null && c.classList.contains("is-collapsible"))) {
        const x = Number(c.dataset.codeIndex ?? -1), O = !c.classList.toggle("is-collapsed");
        x >= 0 && (O ? q.add(x) : q.delete(x));
        for (const X of Array.from(c.querySelectorAll('[data-markdown-action="toggle-code"]'))) X.setAttribute("aria-expanded", String(O));
      }
      if (w === "copy-table" && _(ue((c == null ? void 0 : c.querySelector("table")) ?? null), u), w === "open-file") {
        const x = u.dataset.filePath ?? "", O = ((I = n.cwd) == null ? void 0 : I.replace(/\/$/u, "")) ?? "", X = x.startsWith("/") && O && x.startsWith(`${O}/`) ? x.slice(O.length + 1) : x.replace(/^\.\//u, "");
        p("openFile", { path: X, line: Number(u.dataset.fileLine || 0) || 1 });
      }
      const b = u.closest(".markdown-diagram-shell");
      if (b && w === "diagram-zoom-in" && G(b, 0.2), b && w === "diagram-zoom-out" && G(b, -0.2), b && w === "diagram-fit" && G(b), b && w === "diagram-source") {
        const x = b.querySelector(".markdown-diagram-source");
        x && (x.hidden = !x.hidden);
      }
      if (b && w === "diagram-fullscreen" && ((z = b.requestFullscreen) == null || z.call(b)), b && w === "diagram-export-svg") {
        const x = b.querySelector("svg");
        x && K(new Blob([new XMLSerializer().serializeToString(x)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    function Z() {
      var i;
      (i = k.value) == null || i.close();
    }
    return pe(() => [n.text, n.labels], ([i]) => {
      d(i);
    }, { deep: !0 }), fe(() => {
      L();
    }), ge(() => window.clearTimeout(t)), (i, h) => (m(), g(B, null, [
      y("div", {
        ref_key: "rootRef",
        ref: v,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: f.value,
        onClick: me
      }, null, 8, $e),
      y("dialog", {
        ref_key: "imageDialogRef",
        ref: k,
        class: "cody-markdown-image-dialog",
        onClick: Z
      }, [
        y("button", {
          type: "button",
          "aria-label": "关闭图片预览",
          onClick: Z
        }, "×"),
        y("img", {
          src: a.value,
          alt: "Markdown 图片预览"
        }, null, 8, we)
      ], 512)
    ], 64));
  }
}), Se = ["data-variant"], Ce = {
  key: 0,
  class: "cody-conversation-loading",
  role: "status"
}, xe = {
  key: 1,
  class: "cody-conversation-empty"
}, Ae = {
  key: 0,
  class: "cody-worked-divider"
}, qe = ["data-role"], Le = ["data-role"], Me = { class: "cody-message-stack" }, Te = { class: "cody-message-label" }, Ie = {
  key: 0,
  class: "cody-message-skills"
}, De = {
  key: 1,
  class: "cody-message-body"
}, Re = {
  key: 2,
  class: "cody-message-images"
}, ze = ["src"], Be = ["onClick"], Oe = ["data-tone", "open"], Pe = { key: 0 }, je = { key: 1 }, Ee = {
  key: 3,
  class: "cody-reasoning-card"
}, Fe = {
  key: 4,
  class: "cody-plan-card",
  open: ""
}, Ue = ["data-kind"], Ve = {
  key: 0,
  class: "cody-request-actions"
}, Ne = ["onClick"], He = ["onClick"], We = {
  key: 6,
  class: "cody-failure-card"
}, ut = /* @__PURE__ */ H({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "resolveApproval"],
  setup(e, { emit: s }) {
    const n = s;
    function p(k) {
      return /fail|error|cancel|reject/iu.test(k) ? "danger" : /complete|success|done|approved/iu.test(k) ? "success" : /run|start|pending|wait/iu.test(k) ? "running" : "neutral";
    }
    function r(k) {
      return k.length > 12e3 ? `${k.slice(0, 12e3)}
…输出已截断` : k;
    }
    function v(k) {
      if (!k || typeof k != "object") return "Codex 请求执行一项受保护操作。";
      const f = k, a = f.reason ?? f.question ?? f.command;
      if (typeof a == "string" && a.trim()) return a;
      const t = (Array.isArray(f.questions) ? f.questions : [])[0];
      if (t && typeof t == "object") {
        const o = t.question ?? t.detail;
        if (typeof o == "string" && o.trim()) return o;
      }
      return "Codex 请求执行一项受保护操作。";
    }
    return (k, f) => (m(), g("section", {
      class: "cody-conversation",
      "data-variant": e.variant,
      "data-cody-component": "conversation-surface"
    }, [
      e.loading ? (m(), g("div", Ce, "正在同步对话…")) : e.entries.length === 0 ? (m(), g("div", xe, [
        E(k.$slots, "empty", {}, () => [
          f[2] || (f[2] = se("开始这个需求的开发", -1))
        ])
      ])) : (m(!0), g(B, { key: 2 }, P(e.entries, (a) => {
        var q, t;
        return m(), g(B, {
          key: a.id
        }, [
          a.kind === "worked" ? (m(), g("div", Ae, [
            y("span", null, A(a.label), 1)
          ])) : a.kind === "message" ? (m(), g("article", {
            key: 1,
            class: "cody-message",
            "data-role": a.message.role
          }, [
            y("div", {
              class: "cody-message-identity",
              "data-role": a.message.role
            }, A(a.message.role === "user" ? "你" : "CW"), 9, Le),
            y("div", Me, [
              y("div", Te, A(a.message.role === "user" ? "你" : a.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (q = a.message.skills) != null && q.length ? (m(), g("ul", Ie, [
                (m(!0), g(B, null, P(a.message.skills, (o) => (m(), g("li", {
                  key: `${o.name}:${o.path}`
                }, "$" + A(o.displayName || o.name), 1))), 128))
              ])) : T("", !0),
              a.message.text ? (m(), g("div", De, [
                E(k.$slots, "markdown", {
                  message: a.message
                }, () => [
                  F(ae, {
                    text: a.message.text,
                    onOpenFile: f[0] || (f[0] = (o) => n("openFile", o))
                  }, null, 8, ["text"])
                ])
              ])) : T("", !0),
              (t = a.message.images) != null && t.length ? (m(), g("div", Re, [
                (m(!0), g(B, null, P(a.message.images, (o) => (m(), g("img", {
                  key: o,
                  src: o,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, ze))), 128))
              ])) : T("", !0),
              a.message.text ? (m(), g("button", {
                key: 3,
                class: "cody-copy-button",
                type: "button",
                onClick: (o) => n("copy", a.message.text)
              }, "复制", 8, Be)) : T("", !0)
            ])
          ], 8, qe)) : a.kind === "tool" ? (m(), g("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": p(a.tool.status),
            open: p(a.tool.status) === "running"
          }, [
            y("summary", null, [
              f[3] || (f[3] = y("span", null, "⌁", -1)),
              y("strong", null, A(a.tool.title), 1),
              y("small", null, A(a.tool.status), 1)
            ]),
            y("p", null, A(a.tool.summary), 1),
            a.tool.details.length ? (m(), g("ul", Pe, [
              (m(!0), g(B, null, P(a.tool.details, (o) => (m(), g("li", { key: o }, A(o), 1))), 128))
            ])) : T("", !0),
            a.tool.output ? (m(), g("pre", je, A(r(a.tool.output)), 1)) : T("", !0)
          ], 8, Oe)) : a.kind === "reasoning" ? (m(), g("details", Ee, [
            y("summary", null, "✦ " + A(a.title || "推理过程"), 1),
            y("pre", null, A(a.text), 1)
          ])) : a.kind === "plan" ? (m(), g("details", Fe, [
            f[4] || (f[4] = y("summary", null, "计划", -1)),
            F(ae, {
              text: a.text,
              onOpenFile: f[1] || (f[1] = (o) => n("openFile", o))
            }, null, 8, ["text"])
          ])) : a.kind === "request" ? (m(), g("article", {
            key: 5,
            class: "cody-request-card",
            "data-kind": a.request.kind
          }, [
            y("div", null, [
              y("strong", null, A(a.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
              f[5] || (f[5] = y("small", null, "Agent 已暂停等待", -1))
            ]),
            y("p", null, A(v(a.request.params)), 1),
            E(k.$slots, "request", {
              request: a.request
            }, () => [
              a.request.kind === "approval" ? (m(), g("div", Ve, [
                y("button", {
                  type: "button",
                  onClick: (o) => n("resolveApproval", a.request.id, "accept")
                }, "允许一次", 8, Ne),
                y("button", {
                  type: "button",
                  "data-tone": "danger",
                  onClick: (o) => n("resolveApproval", a.request.id, "decline")
                }, "拒绝", 8, He)
              ])) : T("", !0)
            ])
          ], 8, Ue)) : a.kind === "failure" ? (m(), g("details", We, [
            f[6] || (f[6] = y("summary", null, "本次回复失败", -1)),
            y("p", null, A(a.text), 1)
          ])) : T("", !0)
        ], 64);
      }), 128))
    ], 8, Se));
  }
}), Ge = ["data-variant"], Xe = { class: "cody-composer-shell" }, Ye = {
  key: 0,
  class: "cody-composer-selected",
  "aria-label": "Selected skills"
}, Ke = ["disabled", "aria-label", "onClick"], _e = ["value", "disabled", "placeholder"], Ze = { class: "cody-composer-controls" }, Je = {
  key: 0,
  class: "cody-composer-compact-control cody-composer-skill-control",
  title: "为本轮显式选择 Skill"
}, Qe = ["disabled"], et = ["value"], tt = { class: "cody-composer-actions" }, ot = ["disabled"], nt = ["disabled", "aria-label"], at = {
  key: 1,
  class: "cody-composer-policy"
}, mt = /* @__PURE__ */ H({
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
    const n = H({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(o, { emit: l }) {
        return () => Y("label", { class: "cody-composer-compact-control", title: o.label }, [
          Y("select", { value: o.modelValue, disabled: o.disabled, "aria-label": o.label, onChange: (d) => l("update:modelValue", d.target.value) }, o.options.map((d) => Y("option", { value: d.value }, d.label)))
        ]);
      }
    }), p = e, r = s, v = N(() => p.skills.filter((o) => !p.selectedSkills.includes(o.value))), k = N(() => {
      var o;
      return ((o = p.permissionOptions.find((l) => l.value === p.selectedPermission)) == null ? void 0 : o.description) ?? "";
    }), f = N(() => p.isRunning && p.selectedSubmitMode === "guide" ? "发送引导" : p.isRunning ? "加入队列" : "发送");
    function a(o, l) {
      var d;
      return ((d = o.find((L) => L.value === l)) == null ? void 0 : d.label) ?? l;
    }
    function q(o) {
      o && !p.selectedSkills.includes(o) && r("update:selected-skills", [...p.selectedSkills, o]);
    }
    function t(o) {
      r("update:selected-skills", p.selectedSkills.filter((l) => l !== o));
    }
    return (o, l) => (m(), g("form", {
      class: "cody-composer",
      "data-variant": e.variant,
      "data-cody-component": "composer-surface",
      onSubmit: l[9] || (l[9] = J((d) => r("send"), ["prevent"]))
    }, [
      y("div", Xe, [
        e.selectedSkills.length ? (m(), g("div", Ye, [
          (m(!0), g(B, null, P(e.selectedSkills, (d) => (m(), g("span", {
            key: d,
            class: "cody-composer-chip"
          }, [
            se(" $" + A(a(e.skills, d)) + " ", 1),
            y("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${a(e.skills, d)}`,
              onClick: (L) => t(d)
            }, "×", 8, Ke)
          ]))), 128))
        ])) : T("", !0),
        y("textarea", {
          value: e.draft,
          rows: "1",
          disabled: e.disabled,
          placeholder: e.placeholder,
          onInput: l[0] || (l[0] = (d) => r("update:draft", d.target.value)),
          onKeydown: l[1] || (l[1] = be(J((d) => r("send"), ["exact", "prevent"]), ["enter"]))
        }, null, 40, _e),
        y("div", Ze, [
          E(o.$slots, "leading"),
          e.skills.length ? (m(), g("label", Je, [
            l[11] || (l[11] = y("span", {
              class: "cody-composer-icon",
              "aria-hidden": "true"
            }, "✦", -1)),
            y("select", {
              value: "",
              disabled: e.disabled,
              "aria-label": "添加 Skill",
              onChange: l[2] || (l[2] = (d) => q(d.target.value))
            }, [
              l[10] || (l[10] = y("option", { value: "" }, "Skills", -1)),
              (m(!0), g(B, null, P(v.value, (d) => (m(), g("option", {
                key: d.value,
                value: d.value
              }, "$" + A(d.label), 9, et))), 128))
            ], 40, Qe)
          ])) : T("", !0),
          e.collaborationModes.length ? (m(), Q(j(n), {
            key: 1,
            label: "协作模式",
            "model-value": e.selectedCollaborationMode,
            options: e.collaborationModes,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": l[3] || (l[3] = (d) => r("update:collaboration-mode", d))
          }, null, 8, ["model-value", "options", "disabled"])) : T("", !0),
          F(j(n), {
            label: "提交策略",
            "model-value": e.selectedSubmitMode,
            options: e.submitModes,
            disabled: e.disabled,
            "onUpdate:modelValue": l[4] || (l[4] = (d) => r("update:submit-mode", d))
          }, null, 8, ["model-value", "options", "disabled"]),
          e.models.length ? (m(), Q(j(n), {
            key: 2,
            label: "模型",
            "model-value": e.selectedModel,
            options: e.models,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": l[5] || (l[5] = (d) => r("update:model", d))
          }, null, 8, ["model-value", "options", "disabled"])) : T("", !0),
          F(j(n), {
            label: "推理强度",
            "model-value": e.selectedReasoning,
            options: e.reasoningOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": l[6] || (l[6] = (d) => r("update:reasoning", d))
          }, null, 8, ["model-value", "options", "disabled"]),
          F(j(n), {
            label: "权限",
            "model-value": e.selectedPermission,
            options: e.permissionOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": l[7] || (l[7] = (d) => r("update:permission", d))
          }, null, 8, ["model-value", "options", "disabled"]),
          E(o.$slots, "controls"),
          y("div", tt, [
            e.isRunning ? (m(), g("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: e.disabled,
              onClick: l[8] || (l[8] = (d) => r("stop"))
            }, "停止", 8, ot)) : T("", !0),
            y("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: e.disabled || !e.draft.trim(),
              "aria-label": f.value
            }, "↑", 8, nt)
          ])
        ]),
        k.value ? (m(), g("p", at, A(k.value), 1)) : T("", !0)
      ])
    ], 40, Ge));
  }
});
function st(e) {
  if (!Number.isFinite(e) || e <= 0)
    return "<1s";
  const s = Math.max(1, Math.round(e / 1e3)), n = Math.floor(s / 3600), p = Math.floor(s % 3600 / 60), r = s % 60, v = [];
  return n > 0 && v.push(`${String(n)}h`), (p > 0 || n > 0) && v.push(`${String(p)}m`), v.push(`${String(r > 0 || v.length === 0 ? r : 0)}s`), v.join(" ");
}
function pt(e) {
  var f, a, q;
  const s = [], n = /* @__PURE__ */ new Set(), p = new Map(e.messages.map((t) => [t.id, t])), r = new Map(e.timeline.map((t) => [t.id, t])), v = (t) => {
    if (t.kind === "reasoning") {
      s.push({ id: t.id, kind: "reasoning", text: t.text }), n.add(t.id);
      return;
    }
    if (!t.tool.summary && t.tool.details.length === 0 && !t.tool.output && t.tool.kind !== "fileChange") return;
    if (t.tool.kind !== "fileChange") {
      s.push({ id: t.id, kind: "tool", tool: t.tool }), n.add(t.id);
      return;
    }
    const o = `file-group:${t.turnId ?? t.id}`, l = s.at(-1);
    if (!l || l.kind !== "tool" || l.id !== o) {
      const W = { id: o, kind: "tool", tool: { ...t.tool } };
      s.push(W), n.add(t.id);
      return;
    }
    const d = [.../* @__PURE__ */ new Set([...l.tool.details, ...t.tool.details])], L = [l.tool.output, t.tool.output].filter(Boolean).join(`

`);
    l.tool = {
      ...l.tool,
      status: /fail|error|cancel|reject/iu.test(`${l.tool.status} ${t.tool.status}`) ? "failed" : t.tool.status,
      title: d.length > 1 ? `文件变更 · ${String(d.length)} 个文件` : "文件变更",
      summary: d.length ? `${String(d.length)} 个文件已更新` : t.tool.summary,
      details: d,
      ...L ? { output: L } : {}
    }, n.add(t.id);
  };
  for (const t of e.presentation ?? [])
    if (t.kind === "message") {
      const o = p.get(t.id);
      o && (s.push({ id: o.id, kind: "message", message: o }), n.add(o.id));
    } else if (t.kind === "timeline") {
      const o = r.get(t.id);
      o && v(o);
    } else if (t.kind === "plan")
      (f = e.plan) != null && f.text && (!t.turnId || t.turnId === e.plan.turnId) && (s.push({ id: t.id, kind: "plan", text: e.plan.text }), n.add(t.id));
    else if (t.kind === "request") {
      const o = e.pendingRequests.find((l) => `request:${l.id}` === t.id);
      o && (s.push({ id: t.id, kind: "request", request: o }), n.add(t.id));
    } else if (t.kind === "failure") {
      const o = t.turnId ? e.turns[t.turnId] : void 0;
      o != null && o.error && (s.push({ id: t.id, kind: "failure", text: o.error }), n.add(t.id));
    } else if (t.kind === "worked") {
      const o = t.turnId ? e.turns[t.turnId] : void 0;
      if (o != null && o.completedAtIso) {
        const l = o.startedAtIso ? Date.parse(o.completedAtIso) - Date.parse(o.startedAtIso) : 0;
        s.push({ id: t.id, kind: "worked", label: `Worked for ${st(l)}` }), n.add(t.id);
      }
    }
  for (const t of e.messages) n.has(t.id) || s.push({ id: t.id, kind: "message", message: t });
  for (const t of e.timeline) n.has(t.id) || v(t);
  const k = `plan:${((a = e.plan) == null ? void 0 : a.turnId) || "current"}`;
  (q = e.plan) != null && q.text && !n.has(k) && s.push({ id: k, kind: "plan", text: e.plan.text });
  for (const t of e.pendingRequests) n.has(`request:${t.id}`) || s.push({ id: `request:${t.id}`, kind: "request", request: t });
  for (const t of Object.values(e.turns))
    t.lifecycle === "failed" && t.error && !n.has(`failure:${t.id}`) && s.push({ id: `failure:${t.id}`, kind: "failure", text: t.error });
  return s;
}
export {
  mt as CodyComposer,
  ut as CodyConversation,
  ae as CodyMarkdown,
  U as DEFAULT_CODY_MARKDOWN_LABELS,
  pt as conversationEntriesFromState,
  oe as renderCodyMarkdown,
  ne as stabilizeStreamingMarkdown
};
