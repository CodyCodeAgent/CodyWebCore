import { defineComponent as N, computed as F, ref as V, watch as me, onMounted as pe, onBeforeUnmount as ge, openBlock as c, createElementBlock as f, Fragment as P, createElementVNode as h, nextTick as fe, renderSlot as H, createTextVNode as ae, renderList as E, toDisplayString as A, createCommentVNode as D, createVNode as j, h as X, withModifiers as J, withKeys as be, createBlock as Q, unref as U } from "vue";
import ne from "dompurify";
import ye from "markdown-it";
import ke from "markdown-it-footnote";
import ve from "markdown-it-task-lists";
const I = {
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
}, x = new ye({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
x.use(ve, { enabled: !1, label: !0, labelAfter: !0 });
x.use(ke);
function R(e, u) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${e}" aria-label="${u}" title="${u}">${u}</button>`;
}
function se(e, u = "", t = I) {
  const g = u.toLowerCase();
  if (g === "mermaid" || g === "plantuml" || g === "puml") {
    const T = g === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${T}"><header class="markdown-diagram-toolbar"><span>${T}</span><span class="markdown-diagram-actions">${R("diagram-zoom-out", t.zoomOut)}${R("diagram-fit", t.fit)}${R("diagram-zoom-in", t.zoomIn)}${R("diagram-source", t.source)}${R("diagram-fullscreen", t.fullscreen)}${R("diagram-export-svg", "SVG")}${R("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${t.diagramAria(T)}"><p class="markdown-diagram-status">${t.rendering(T)}</p></div><pre class="markdown-diagram-source" hidden><code>${x.utils.escapeHtml(e)}</code></pre></div>
`;
  }
  const s = e.replace(/\n$/u, "").split(`
`), m = s.length <= 2 && s.every((T) => T.length <= 96), $ = s.length > 10, a = u || "text", L = [m ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(u) ? `language-${u}` : ""].filter(Boolean).join(" "), M = L ? ` class="${L}"` : "", S = [m ? "is-compact" : "", $ ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), k = $ ? `${a} · ${t.lineCount(s.length)}` : a, r = $ ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${t.collapseCode}" title="${t.collapseCode}" aria-expanded="false">${t.collapseCode}</button>` : "", i = $ ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${t.expandCode(s.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${S ? ` ${S}` : ""}" data-language="${a}" data-code-lines="${String(s.length)}"><header class="markdown-code-toolbar"><span>${k}</span><span class="markdown-code-actions">${r}${R("wrap-code", t.wrap)}${R("copy-code", t.copy)}${R("save-code", t.save)}</span></header><pre class="markdown-code-block${m ? " is-compact" : ""}"><code${M}>${x.utils.escapeHtml(e)}</code></pre>${i}</div></div>
`;
}
x.renderer.rules.fence = (e, u, t, g) => {
  const s = e[u];
  return se(s.content, s.info.trim().split(/\s+/u)[0] ?? "", g.labels);
};
x.renderer.rules.code_block = (e, u, t, g) => se(e[u].content, "", g.labels);
x.renderer.rules.table_open = (e, u, t, g) => {
  const s = g.labels ?? I;
  return `<section class="markdown-table-shell" role="region" aria-label="${s.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${R("copy-table", s.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
x.renderer.rules.table_close = () => `</table></div></section>
`;
const _ = x.renderer.rules.code_inline;
x.renderer.rules.code_inline = (e, u, t, g, s) => {
  const m = e[u].content, $ = m.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!$ || /\s/u.test(m)) return _ ? _(e, u, t, g, s) : s.renderToken(e, u, t);
  const a = x.utils.escapeHtml($[1]), L = $[2] ?? "", M = g.labels ?? I;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${a}" data-file-line="${L}" title="${M.openFile(a)}"><code>${x.utils.escapeHtml(m)}</code></button>`;
};
const ee = x.renderer.rules.link_open;
x.renderer.rules.link_open = (e, u, t, g, s) => {
  const m = e[u];
  return /^https?:\/\//u.test(m.attrGet("href") ?? "") && (m.attrSet("target", "_blank"), m.attrSet("rel", "noopener noreferrer")), ee ? ee(e, u, t, g, s) : s.renderToken(e, u, t);
};
function te(e, u = I) {
  return ne.sanitize(x.render(e, { labels: u }), {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"]
  });
}
function oe(e) {
  var u;
  return (((u = e.match(/^\s*```/gmu)) == null ? void 0 : u.length) ?? 0) % 2 === 1 ? `${e}

\`\`\`` : e;
}
const we = ["innerHTML"], he = ["src"], $e = /* @__PURE__ */ N({
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
  setup(e, { emit: u }) {
    const t = e, g = u, s = F(() => t.labels ?? I), m = V(null), $ = V(null), a = V(te(oe(t.text), s.value)), L = V(""), M = /* @__PURE__ */ new Set();
    let S = 0, k = 0;
    const r = {
      javascript: () => import("highlight.js/lib/languages/javascript"),
      typescript: () => import("highlight.js/lib/languages/typescript"),
      python: () => import("highlight.js/lib/languages/python"),
      go: () => import("highlight.js/lib/languages/go"),
      rust: () => import("highlight.js/lib/languages/rust"),
      json: () => import("highlight.js/lib/languages/json"),
      bash: () => import("highlight.js/lib/languages/bash"),
      sql: () => import("highlight.js/lib/languages/sql")
    };
    async function i(o) {
      window.clearTimeout(S), S = window.setTimeout(async () => {
        a.value = te(oe(o), s.value), await fe(), T();
      }, t.renderDelay);
    }
    async function T() {
      var b, l, n, y, d, z;
      for (const v of Array.from(((b = m.value) == null ? void 0 : b.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((l = v.textContent) == null ? void 0 : l.trim()) ?? "") && (v.dataset.numeric = "true");
      for (const v of Array.from(((n = m.value) == null ? void 0 : n.querySelectorAll("img")) ?? []))
        v.addEventListener("error", () => {
          v.alt = v.alt || "图片加载失败", v.classList.add("is-load-error");
        }, { once: !0 });
      le();
      for (const [v, w] of Array.from(((y = m.value) == null ? void 0 : y.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        w.dataset.codeIndex = String(v), w.classList.contains("is-collapsible") && M.has(v) && w.classList.remove("is-collapsed");
        for (const C of Array.from(w.querySelectorAll('[data-markdown-action="toggle-code"]')))
          C.setAttribute("aria-expanded", String(!w.classList.contains("is-collapsed")));
        const q = w.querySelector("pre"), B = w.querySelector('[data-markdown-action="wrap-code"]');
        q && B && (B.hidden = q.scrollWidth <= q.clientWidth + 2, B.setAttribute("aria-pressed", String(w.classList.contains("is-wrapped"))));
      }
      await re();
      const o = Array.from(((d = m.value) == null ? void 0 : d.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (o.length === 0) return;
      const p = (await import("highlight.js/lib/core")).default;
      for (const v of o) {
        const w = ((z = Array.from(v.classList).find((C) => C.startsWith("language-"))) == null ? void 0 : z.slice(9)) ?? "", q = r[w];
        if (!q || v.dataset.highlighted === "yes") continue;
        const B = await q();
        p.getLanguage(w) || p.registerLanguage(w, B.default), v.innerHTML = p.highlight(v.textContent ?? "", { language: w }).value, v.dataset.highlighted = "yes";
      }
    }
    function le() {
      var p;
      if (!t.resolveAssetUrl) return;
      const o = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const b of Array.from(((p = m.value) == null ? void 0 : p.querySelectorAll("a[href]")) ?? [])) {
        const l = b.getAttribute("href") ?? "";
        if (!o.test(l) || /^(?:data|blob):/iu.test(l)) continue;
        const n = t.resolveAssetUrl(l);
        n && (b.href = n, b.target = "_blank", b.rel = "noopener noreferrer");
      }
    }
    async function re() {
      var p, b, l, n;
      const o = Array.from(((p = m.value) == null ? void 0 : p.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const y of o) {
        y.dataset.rendered = "loading";
        const d = y.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", z = ((b = y.querySelector("code")) == null ? void 0 : b.textContent) ?? "", v = y.querySelector(".markdown-diagram-stage");
        if (v)
          try {
            let w = await ((l = t.renderDiagram) == null ? void 0 : l.call(t, { engine: d, source: z, dark: t.dark }));
            if (!w && d === "mermaid") {
              const { default: q } = await import("mermaid");
              q.initialize({ startOnLoad: !1, securityLevel: "strict", theme: t.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), w = (await q.render(`cody-diagram-${String(++k)}`, z)).svg;
            }
            if (!w) throw new Error(d === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            v.innerHTML = ie(w), de(v), y.dataset.rendered = "yes", y.style.setProperty("--diagram-scale", "1");
          } catch (w) {
            v.textContent = w instanceof Error ? w.message : "图表渲染失败", v.classList.add("markdown-diagram-error"), (n = y.querySelector(".markdown-diagram-source")) == null || n.removeAttribute("hidden"), y.dataset.rendered = "error";
          }
      }
    }
    function ie(o) {
      const p = ne.sanitize(o, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), b = p.trimStart().startsWith("<svg") ? p : `<svg xmlns="http://www.w3.org/2000/svg">${p}</svg>`, l = new DOMParser().parseFromString(b, "image/svg+xml");
      if (l.querySelector("parsererror")) return "";
      for (const n of l.querySelectorAll("*")) for (const y of Array.from(n.attributes)) /^on/iu.test(y.name) && n.removeAttribute(y.name);
      return l.querySelectorAll("script").forEach((n) => n.remove()), new XMLSerializer().serializeToString(l.documentElement);
    }
    function de(o) {
      if (o.dataset.panReady === "true") return;
      o.dataset.panReady = "true";
      let p = 0, b = 0, l = 0, n = 0;
      o.addEventListener("pointerdown", (d) => {
        d.button === 0 && (p = d.clientX, b = d.clientY, l = o.scrollLeft, n = o.scrollTop, o.setPointerCapture(d.pointerId), o.classList.add("is-panning"));
      }), o.addEventListener("pointermove", (d) => {
        o.hasPointerCapture(d.pointerId) && (o.scrollLeft = l - (d.clientX - p), o.scrollTop = n - (d.clientY - b));
      });
      const y = (d) => {
        o.hasPointerCapture(d.pointerId) && o.releasePointerCapture(d.pointerId), o.classList.remove("is-panning");
      };
      o.addEventListener("pointerup", y), o.addEventListener("pointercancel", y);
    }
    function W(o, p = 0) {
      const b = Number(o.style.getPropertyValue("--diagram-scale") || "1");
      o.style.setProperty("--diagram-scale", String(p === 0 ? 1 : Math.min(2.5, Math.max(0.4, b + p))));
    }
    function Y(o, p) {
      const b = document.createElement("a");
      b.href = URL.createObjectURL(o), b.download = p, b.click(), URL.revokeObjectURL(b.href);
    }
    async function K(o, p) {
      const b = p.textContent;
      try {
        await navigator.clipboard.writeText(o), p.textContent = "已复制";
      } catch {
        const l = document.createElement("textarea");
        l.value = o, l.style.position = "fixed", l.style.opacity = "0", document.body.appendChild(l), l.select();
        const n = document.execCommand("copy");
        l.remove(), p.textContent = n ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        p.textContent = b;
      }, 1200);
    }
    function ce(o) {
      return Array.from((o == null ? void 0 : o.rows) ?? []).map((p) => Array.from(p.cells).map((b) => {
        var l;
        return `"${((l = b.textContent) == null ? void 0 : l.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function ue(o) {
      var z, v, w, q, B;
      const p = o.target, b = p.closest("img");
      if (b) {
        L.value = b.currentSrc || b.src, (z = $.value) == null || z.showModal();
        return;
      }
      const l = p.closest("[data-markdown-action]");
      if (!l) return;
      const n = l.closest(".markdown-code-shell, .markdown-table-shell"), y = l.dataset.markdownAction;
      if (y === "copy-code" && K(((v = n == null ? void 0 : n.querySelector("code")) == null ? void 0 : v.textContent) ?? "", l), y === "wrap-code") {
        const C = (n == null ? void 0 : n.classList.toggle("is-wrapped")) ?? !1;
        l.textContent = C && s.value.scroll || s.value.wrap, l.setAttribute("aria-pressed", String(C));
      }
      if (y === "save-code" && Y(new Blob([((w = n == null ? void 0 : n.querySelector("code")) == null ? void 0 : w.textContent) ?? ""], { type: "text/plain" }), `snippet.${(n == null ? void 0 : n.dataset.language) || "txt"}`), y === "toggle-code" && (n != null && n.classList.contains("is-collapsible"))) {
        const C = Number(n.dataset.codeIndex ?? -1), O = !n.classList.toggle("is-collapsed");
        C >= 0 && (O ? M.add(C) : M.delete(C));
        for (const G of Array.from(n.querySelectorAll('[data-markdown-action="toggle-code"]'))) G.setAttribute("aria-expanded", String(O));
      }
      if (y === "copy-table" && K(ce((n == null ? void 0 : n.querySelector("table")) ?? null), l), y === "open-file") {
        const C = l.dataset.filePath ?? "", O = ((q = t.cwd) == null ? void 0 : q.replace(/\/$/u, "")) ?? "", G = C.startsWith("/") && O && C.startsWith(`${O}/`) ? C.slice(O.length + 1) : C.replace(/^\.\//u, "");
        g("openFile", { path: G, line: Number(l.dataset.fileLine || 0) || 1 });
      }
      const d = l.closest(".markdown-diagram-shell");
      if (d && y === "diagram-zoom-in" && W(d, 0.2), d && y === "diagram-zoom-out" && W(d, -0.2), d && y === "diagram-fit" && W(d), d && y === "diagram-source") {
        const C = d.querySelector(".markdown-diagram-source");
        C && (C.hidden = !C.hidden);
      }
      if (d && y === "diagram-fullscreen" && ((B = d.requestFullscreen) == null || B.call(d)), d && y === "diagram-export-svg") {
        const C = d.querySelector("svg");
        C && Y(new Blob([new XMLSerializer().serializeToString(C)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    function Z() {
      var o;
      (o = $.value) == null || o.close();
    }
    return me(() => [t.text, t.labels], ([o]) => {
      i(o);
    }, { deep: !0 }), pe(() => {
      T();
    }), ge(() => window.clearTimeout(S)), (o, p) => (c(), f(P, null, [
      h("div", {
        ref_key: "rootRef",
        ref: m,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: a.value,
        onClick: ue
      }, null, 8, we),
      h("dialog", {
        ref_key: "imageDialogRef",
        ref: $,
        class: "cody-markdown-image-dialog",
        onClick: Z
      }, [
        h("button", {
          type: "button",
          "aria-label": "关闭图片预览",
          onClick: Z
        }, "×"),
        h("img", {
          src: L.value,
          alt: "Markdown 图片预览"
        }, null, 8, he)
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
}, Le = ["data-role"], Me = ["data-role"], Te = { class: "cody-message-stack" }, qe = { class: "cody-message-label" }, De = {
  key: 0,
  class: "cody-message-skills"
}, Re = {
  key: 1,
  class: "cody-message-body"
}, ze = {
  key: 2,
  class: "cody-message-images"
}, Be = ["src"], Pe = ["onClick"], Oe = ["data-tone", "open"], Ee = { key: 0 }, Ue = { key: 1 }, Ie = {
  key: 3,
  class: "cody-reasoning-card"
}, nt = /* @__PURE__ */ N({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile"],
  setup(e, { emit: u }) {
    const t = u;
    function g(m) {
      return /fail|error|cancel|reject/iu.test(m) ? "danger" : /complete|success|done|approved/iu.test(m) ? "success" : /run|start|pending|wait/iu.test(m) ? "running" : "neutral";
    }
    function s(m) {
      return m.length > 12e3 ? `${m.slice(0, 12e3)}
…输出已截断` : m;
    }
    return (m, $) => (c(), f("section", {
      class: "cody-conversation",
      "data-variant": e.variant,
      "data-cody-component": "conversation-surface"
    }, [
      e.loading ? (c(), f("div", Ce, "正在同步对话…")) : e.entries.length === 0 ? (c(), f("div", xe, [
        H(m.$slots, "empty", {}, () => [
          $[1] || ($[1] = ae("开始这个需求的开发", -1))
        ])
      ])) : (c(!0), f(P, { key: 2 }, E(e.entries, (a) => {
        var L, M;
        return c(), f(P, {
          key: a.id
        }, [
          a.kind === "worked" ? (c(), f("div", Ae, [
            h("span", null, A(a.label), 1)
          ])) : a.kind === "message" ? (c(), f("article", {
            key: 1,
            class: "cody-message",
            "data-role": a.message.role
          }, [
            h("div", {
              class: "cody-message-identity",
              "data-role": a.message.role
            }, A(a.message.role === "user" ? "你" : "CW"), 9, Me),
            h("div", Te, [
              h("div", qe, A(a.message.role === "user" ? "你" : a.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (L = a.message.skills) != null && L.length ? (c(), f("ul", De, [
                (c(!0), f(P, null, E(a.message.skills, (S) => (c(), f("li", {
                  key: `${S.name}:${S.path}`
                }, "$" + A(S.displayName || S.name), 1))), 128))
              ])) : D("", !0),
              a.message.text ? (c(), f("div", Re, [
                H(m.$slots, "markdown", {
                  message: a.message
                }, () => [
                  j($e, {
                    text: a.message.text,
                    onOpenFile: $[0] || ($[0] = (S) => t("openFile", S))
                  }, null, 8, ["text"])
                ])
              ])) : D("", !0),
              (M = a.message.images) != null && M.length ? (c(), f("div", ze, [
                (c(!0), f(P, null, E(a.message.images, (S) => (c(), f("img", {
                  key: S,
                  src: S,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, Be))), 128))
              ])) : D("", !0),
              a.message.text ? (c(), f("button", {
                key: 3,
                class: "cody-copy-button",
                type: "button",
                onClick: (S) => t("copy", a.message.text)
              }, "复制", 8, Pe)) : D("", !0)
            ])
          ], 8, Le)) : a.kind === "tool" ? (c(), f("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": g(a.tool.status),
            open: g(a.tool.status) === "running"
          }, [
            h("summary", null, [
              $[2] || ($[2] = h("span", null, "⌁", -1)),
              h("strong", null, A(a.tool.title), 1),
              h("small", null, A(a.tool.status), 1)
            ]),
            h("p", null, A(a.tool.summary), 1),
            a.tool.details.length ? (c(), f("ul", Ee, [
              (c(!0), f(P, null, E(a.tool.details, (S) => (c(), f("li", { key: S }, A(S), 1))), 128))
            ])) : D("", !0),
            a.tool.output ? (c(), f("pre", Ue, A(s(a.tool.output)), 1)) : D("", !0)
          ], 8, Oe)) : (c(), f("details", Ie, [
            h("summary", null, "✦ " + A(a.title || "推理过程"), 1),
            h("pre", null, A(a.text), 1)
          ]))
        ], 64);
      }), 128))
    ], 8, Se));
  }
}), Ve = ["data-variant"], Fe = { class: "cody-composer-shell" }, je = {
  key: 0,
  class: "cody-composer-selected",
  "aria-label": "Selected skills"
}, Ne = ["disabled", "aria-label", "onClick"], He = ["value", "disabled", "placeholder"], We = { class: "cody-composer-controls" }, Ge = {
  key: 0,
  class: "cody-composer-compact-control cody-composer-skill-control",
  title: "为本轮显式选择 Skill"
}, Xe = ["disabled"], Ye = ["value"], Ke = { class: "cody-composer-actions" }, Ze = ["disabled"], Je = ["disabled", "aria-label"], Qe = {
  key: 1,
  class: "cody-composer-policy"
}, st = /* @__PURE__ */ N({
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
  setup(e, { emit: u }) {
    const t = N({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(k, { emit: r }) {
        return () => X("label", { class: "cody-composer-compact-control", title: k.label }, [
          X("select", { value: k.modelValue, disabled: k.disabled, "aria-label": k.label, onChange: (i) => r("update:modelValue", i.target.value) }, k.options.map((i) => X("option", { value: i.value }, i.label)))
        ]);
      }
    }), g = e, s = u, m = F(() => g.skills.filter((k) => !g.selectedSkills.includes(k.value))), $ = F(() => {
      var k;
      return ((k = g.permissionOptions.find((r) => r.value === g.selectedPermission)) == null ? void 0 : k.description) ?? "";
    }), a = F(() => g.isRunning && g.selectedSubmitMode === "guide" ? "发送引导" : g.isRunning ? "加入队列" : "发送");
    function L(k, r) {
      var i;
      return ((i = k.find((T) => T.value === r)) == null ? void 0 : i.label) ?? r;
    }
    function M(k) {
      k && !g.selectedSkills.includes(k) && s("update:selected-skills", [...g.selectedSkills, k]);
    }
    function S(k) {
      s("update:selected-skills", g.selectedSkills.filter((r) => r !== k));
    }
    return (k, r) => (c(), f("form", {
      class: "cody-composer",
      "data-variant": e.variant,
      "data-cody-component": "composer-surface",
      onSubmit: r[9] || (r[9] = J((i) => s("send"), ["prevent"]))
    }, [
      h("div", Fe, [
        e.selectedSkills.length ? (c(), f("div", je, [
          (c(!0), f(P, null, E(e.selectedSkills, (i) => (c(), f("span", {
            key: i,
            class: "cody-composer-chip"
          }, [
            ae(" $" + A(L(e.skills, i)) + " ", 1),
            h("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${L(e.skills, i)}`,
              onClick: (T) => S(i)
            }, "×", 8, Ne)
          ]))), 128))
        ])) : D("", !0),
        h("textarea", {
          value: e.draft,
          rows: "1",
          disabled: e.disabled,
          placeholder: e.placeholder,
          onInput: r[0] || (r[0] = (i) => s("update:draft", i.target.value)),
          onKeydown: r[1] || (r[1] = be(J((i) => s("send"), ["exact", "prevent"]), ["enter"]))
        }, null, 40, He),
        h("div", We, [
          H(k.$slots, "leading"),
          e.skills.length ? (c(), f("label", Ge, [
            r[11] || (r[11] = h("span", {
              class: "cody-composer-icon",
              "aria-hidden": "true"
            }, "✦", -1)),
            h("select", {
              value: "",
              disabled: e.disabled,
              "aria-label": "添加 Skill",
              onChange: r[2] || (r[2] = (i) => M(i.target.value))
            }, [
              r[10] || (r[10] = h("option", { value: "" }, "Skills", -1)),
              (c(!0), f(P, null, E(m.value, (i) => (c(), f("option", {
                key: i.value,
                value: i.value
              }, "$" + A(i.label), 9, Ye))), 128))
            ], 40, Xe)
          ])) : D("", !0),
          e.collaborationModes.length ? (c(), Q(U(t), {
            key: 1,
            label: "协作模式",
            "model-value": e.selectedCollaborationMode,
            options: e.collaborationModes,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": r[3] || (r[3] = (i) => s("update:collaboration-mode", i))
          }, null, 8, ["model-value", "options", "disabled"])) : D("", !0),
          j(U(t), {
            label: "提交策略",
            "model-value": e.selectedSubmitMode,
            options: e.submitModes,
            disabled: e.disabled,
            "onUpdate:modelValue": r[4] || (r[4] = (i) => s("update:submit-mode", i))
          }, null, 8, ["model-value", "options", "disabled"]),
          e.models.length ? (c(), Q(U(t), {
            key: 2,
            label: "模型",
            "model-value": e.selectedModel,
            options: e.models,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": r[5] || (r[5] = (i) => s("update:model", i))
          }, null, 8, ["model-value", "options", "disabled"])) : D("", !0),
          j(U(t), {
            label: "推理强度",
            "model-value": e.selectedReasoning,
            options: e.reasoningOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": r[6] || (r[6] = (i) => s("update:reasoning", i))
          }, null, 8, ["model-value", "options", "disabled"]),
          j(U(t), {
            label: "权限",
            "model-value": e.selectedPermission,
            options: e.permissionOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": r[7] || (r[7] = (i) => s("update:permission", i))
          }, null, 8, ["model-value", "options", "disabled"]),
          H(k.$slots, "controls"),
          h("div", Ke, [
            e.isRunning ? (c(), f("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: e.disabled,
              onClick: r[8] || (r[8] = (i) => s("stop"))
            }, "停止", 8, Ze)) : D("", !0),
            h("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: e.disabled || !e.draft.trim(),
              "aria-label": a.value
            }, "↑", 8, Je)
          ])
        ]),
        $.value ? (c(), f("p", Qe, A($.value), 1)) : D("", !0)
      ])
    ], 40, Ve));
  }
});
export {
  st as CodyComposer,
  nt as CodyConversation,
  $e as CodyMarkdown,
  I as DEFAULT_CODY_MARKDOWN_LABELS,
  te as renderCodyMarkdown,
  oe as stabilizeStreamingMarkdown
};
