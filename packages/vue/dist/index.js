import { defineComponent as N, computed as F, ref as V, watch as me, onMounted as pe, onBeforeUnmount as ge, openBlock as c, createElementBlock as f, Fragment as P, createElementVNode as h, nextTick as fe, renderSlot as H, createTextVNode as ae, renderList as O, toDisplayString as A, createCommentVNode as q, createVNode as j, h as X, withModifiers as J, withKeys as be, createBlock as Q, unref as U } from "vue";
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
function D(e, u) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${e}" aria-label="${u}" title="${u}">${u}</button>`;
}
function se(e, u = "", t = I) {
  const p = u.toLowerCase();
  if (p === "mermaid" || p === "plantuml" || p === "puml") {
    const n = p === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${n}"><header class="markdown-diagram-toolbar"><span>${n}</span><span class="markdown-diagram-actions">${D("diagram-zoom-out", t.zoomOut)}${D("diagram-fit", t.fit)}${D("diagram-zoom-in", t.zoomIn)}${D("diagram-source", t.source)}${D("diagram-fullscreen", t.fullscreen)}${D("diagram-export-svg", "SVG")}${D("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${t.diagramAria(n)}"><p class="markdown-diagram-status">${t.rendering(n)}</p></div><pre class="markdown-diagram-source" hidden><code>${x.utils.escapeHtml(e)}</code></pre></div>
`;
  }
  const l = e.replace(/\n$/u, "").split(`
`), g = l.length <= 2 && l.every((n) => n.length <= 96), $ = l.length > 10, a = u || "text", M = /^[A-Za-z0-9_-]+$/u.test(u) ? ` class="language-${u}"` : "", L = [g ? "is-compact" : "", $ ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), C = $ ? `${a} · ${t.lineCount(l.length)}` : a, k = $ ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${t.collapseCode}" title="${t.collapseCode}" aria-expanded="false">${t.collapseCode}</button>` : "", i = $ ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${t.expandCode(l.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${L ? ` ${L}` : ""}" data-language="${a}" data-code-lines="${String(l.length)}"><header class="markdown-code-toolbar"><span>${C}</span><span class="markdown-code-actions">${k}${D("wrap-code", t.wrap)}${D("copy-code", t.copy)}${D("save-code", t.save)}</span></header><pre class="markdown-code-block${g ? " is-compact" : ""}"><code${M}>${x.utils.escapeHtml(e)}</code></pre>${i}</div></div>
`;
}
x.renderer.rules.fence = (e, u, t, p) => {
  const l = e[u];
  return se(l.content, l.info.trim().split(/\s+/u)[0] ?? "", p.labels);
};
x.renderer.rules.code_block = (e, u, t, p) => se(e[u].content, "", p.labels);
x.renderer.rules.table_open = (e, u, t, p) => {
  const l = p.labels ?? I;
  return `<section class="markdown-table-shell" role="region" aria-label="${l.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${D("copy-table", l.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
x.renderer.rules.table_close = () => `</table></div></section>
`;
const _ = x.renderer.rules.code_inline;
x.renderer.rules.code_inline = (e, u, t, p, l) => {
  const g = e[u].content, $ = g.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!$ || /\s/u.test(g)) return _ ? _(e, u, t, p, l) : l.renderToken(e, u, t);
  const a = x.utils.escapeHtml($[1]), M = $[2] ?? "", L = p.labels ?? I;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${a}" data-file-line="${M}" title="${L.openFile(a)}"><code>${x.utils.escapeHtml(g)}</code></button>`;
};
const ee = x.renderer.rules.link_open;
x.renderer.rules.link_open = (e, u, t, p, l) => {
  const g = e[u];
  return /^https?:\/\//u.test(g.attrGet("href") ?? "") && (g.attrSet("target", "_blank"), g.attrSet("rel", "noopener noreferrer")), ee ? ee(e, u, t, p, l) : l.renderToken(e, u, t);
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
    const t = e, p = u, l = F(() => t.labels ?? I), g = V(null), $ = V(null), a = V(te(oe(t.text), l.value)), M = V(""), L = /* @__PURE__ */ new Set();
    let C = 0, k = 0;
    const i = {
      javascript: () => import("highlight.js/lib/languages/javascript"),
      typescript: () => import("highlight.js/lib/languages/typescript"),
      python: () => import("highlight.js/lib/languages/python"),
      go: () => import("highlight.js/lib/languages/go"),
      rust: () => import("highlight.js/lib/languages/rust"),
      json: () => import("highlight.js/lib/languages/json"),
      bash: () => import("highlight.js/lib/languages/bash"),
      sql: () => import("highlight.js/lib/languages/sql")
    };
    async function n(o) {
      window.clearTimeout(C), C = window.setTimeout(async () => {
        a.value = te(oe(o), l.value), await fe(), E();
      }, t.renderDelay);
    }
    async function E() {
      var b, r, s, y, d, R;
      for (const v of Array.from(((b = g.value) == null ? void 0 : b.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((r = v.textContent) == null ? void 0 : r.trim()) ?? "") && (v.dataset.numeric = "true");
      for (const v of Array.from(((s = g.value) == null ? void 0 : s.querySelectorAll("img")) ?? []))
        v.addEventListener("error", () => {
          v.alt = v.alt || "图片加载失败", v.classList.add("is-load-error");
        }, { once: !0 });
      le();
      for (const [v, w] of Array.from(((y = g.value) == null ? void 0 : y.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        w.dataset.codeIndex = String(v), w.classList.contains("is-collapsible") && L.has(v) && w.classList.remove("is-collapsed");
        for (const S of Array.from(w.querySelectorAll('[data-markdown-action="toggle-code"]')))
          S.setAttribute("aria-expanded", String(!w.classList.contains("is-collapsed")));
        const T = w.querySelector("pre"), z = w.querySelector('[data-markdown-action="wrap-code"]');
        T && z && (z.hidden = T.scrollWidth <= T.clientWidth + 2, z.setAttribute("aria-pressed", String(w.classList.contains("is-wrapped"))));
      }
      await re();
      const o = Array.from(((d = g.value) == null ? void 0 : d.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (o.length === 0) return;
      const m = (await import("highlight.js/lib/core")).default;
      for (const v of o) {
        const w = ((R = Array.from(v.classList).find((S) => S.startsWith("language-"))) == null ? void 0 : R.slice(9)) ?? "", T = i[w];
        if (!T || v.dataset.highlighted === "yes") continue;
        const z = await T();
        m.getLanguage(w) || m.registerLanguage(w, z.default), v.innerHTML = m.highlight(v.textContent ?? "", { language: w }).value, v.dataset.highlighted = "yes";
      }
    }
    function le() {
      var m;
      if (!t.resolveAssetUrl) return;
      const o = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const b of Array.from(((m = g.value) == null ? void 0 : m.querySelectorAll("a[href]")) ?? [])) {
        const r = b.getAttribute("href") ?? "";
        if (!o.test(r) || /^(?:data|blob):/iu.test(r)) continue;
        const s = t.resolveAssetUrl(r);
        s && (b.href = s, b.target = "_blank", b.rel = "noopener noreferrer");
      }
    }
    async function re() {
      var m, b, r, s;
      const o = Array.from(((m = g.value) == null ? void 0 : m.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const y of o) {
        y.dataset.rendered = "loading";
        const d = y.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", R = ((b = y.querySelector("code")) == null ? void 0 : b.textContent) ?? "", v = y.querySelector(".markdown-diagram-stage");
        if (v)
          try {
            let w = await ((r = t.renderDiagram) == null ? void 0 : r.call(t, { engine: d, source: R, dark: t.dark }));
            if (!w && d === "mermaid") {
              const { default: T } = await import("mermaid");
              T.initialize({ startOnLoad: !1, securityLevel: "strict", theme: t.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), w = (await T.render(`cody-diagram-${String(++k)}`, R)).svg;
            }
            if (!w) throw new Error(d === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            v.innerHTML = ie(w), de(v), y.dataset.rendered = "yes", y.style.setProperty("--diagram-scale", "1");
          } catch (w) {
            v.textContent = w instanceof Error ? w.message : "图表渲染失败", v.classList.add("markdown-diagram-error"), (s = y.querySelector(".markdown-diagram-source")) == null || s.removeAttribute("hidden"), y.dataset.rendered = "error";
          }
      }
    }
    function ie(o) {
      const m = ne.sanitize(o, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), b = m.trimStart().startsWith("<svg") ? m : `<svg xmlns="http://www.w3.org/2000/svg">${m}</svg>`, r = new DOMParser().parseFromString(b, "image/svg+xml");
      if (r.querySelector("parsererror")) return "";
      for (const s of r.querySelectorAll("*")) for (const y of Array.from(s.attributes)) /^on/iu.test(y.name) && s.removeAttribute(y.name);
      return r.querySelectorAll("script").forEach((s) => s.remove()), new XMLSerializer().serializeToString(r.documentElement);
    }
    function de(o) {
      if (o.dataset.panReady === "true") return;
      o.dataset.panReady = "true";
      let m = 0, b = 0, r = 0, s = 0;
      o.addEventListener("pointerdown", (d) => {
        d.button === 0 && (m = d.clientX, b = d.clientY, r = o.scrollLeft, s = o.scrollTop, o.setPointerCapture(d.pointerId), o.classList.add("is-panning"));
      }), o.addEventListener("pointermove", (d) => {
        o.hasPointerCapture(d.pointerId) && (o.scrollLeft = r - (d.clientX - m), o.scrollTop = s - (d.clientY - b));
      });
      const y = (d) => {
        o.hasPointerCapture(d.pointerId) && o.releasePointerCapture(d.pointerId), o.classList.remove("is-panning");
      };
      o.addEventListener("pointerup", y), o.addEventListener("pointercancel", y);
    }
    function W(o, m = 0) {
      const b = Number(o.style.getPropertyValue("--diagram-scale") || "1");
      o.style.setProperty("--diagram-scale", String(m === 0 ? 1 : Math.min(2.5, Math.max(0.4, b + m))));
    }
    function Y(o, m) {
      const b = document.createElement("a");
      b.href = URL.createObjectURL(o), b.download = m, b.click(), URL.revokeObjectURL(b.href);
    }
    async function K(o, m) {
      const b = m.textContent;
      try {
        await navigator.clipboard.writeText(o), m.textContent = "已复制";
      } catch {
        const r = document.createElement("textarea");
        r.value = o, r.style.position = "fixed", r.style.opacity = "0", document.body.appendChild(r), r.select();
        const s = document.execCommand("copy");
        r.remove(), m.textContent = s ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        m.textContent = b;
      }, 1200);
    }
    function ce(o) {
      return Array.from((o == null ? void 0 : o.rows) ?? []).map((m) => Array.from(m.cells).map((b) => {
        var r;
        return `"${((r = b.textContent) == null ? void 0 : r.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function ue(o) {
      var R, v, w, T, z;
      const m = o.target, b = m.closest("img");
      if (b) {
        M.value = b.currentSrc || b.src, (R = $.value) == null || R.showModal();
        return;
      }
      const r = m.closest("[data-markdown-action]");
      if (!r) return;
      const s = r.closest(".markdown-code-shell, .markdown-table-shell"), y = r.dataset.markdownAction;
      if (y === "copy-code" && K(((v = s == null ? void 0 : s.querySelector("code")) == null ? void 0 : v.textContent) ?? "", r), y === "wrap-code") {
        const S = (s == null ? void 0 : s.classList.toggle("is-wrapped")) ?? !1;
        r.textContent = S && l.value.scroll || l.value.wrap, r.setAttribute("aria-pressed", String(S));
      }
      if (y === "save-code" && Y(new Blob([((w = s == null ? void 0 : s.querySelector("code")) == null ? void 0 : w.textContent) ?? ""], { type: "text/plain" }), `snippet.${(s == null ? void 0 : s.dataset.language) || "txt"}`), y === "toggle-code" && (s != null && s.classList.contains("is-collapsible"))) {
        const S = Number(s.dataset.codeIndex ?? -1), B = !s.classList.toggle("is-collapsed");
        S >= 0 && (B ? L.add(S) : L.delete(S));
        for (const G of Array.from(s.querySelectorAll('[data-markdown-action="toggle-code"]'))) G.setAttribute("aria-expanded", String(B));
      }
      if (y === "copy-table" && K(ce((s == null ? void 0 : s.querySelector("table")) ?? null), r), y === "open-file") {
        const S = r.dataset.filePath ?? "", B = ((T = t.cwd) == null ? void 0 : T.replace(/\/$/u, "")) ?? "", G = S.startsWith("/") && B && S.startsWith(`${B}/`) ? S.slice(B.length + 1) : S.replace(/^\.\//u, "");
        p("openFile", { path: G, line: Number(r.dataset.fileLine || 0) || 1 });
      }
      const d = r.closest(".markdown-diagram-shell");
      if (d && y === "diagram-zoom-in" && W(d, 0.2), d && y === "diagram-zoom-out" && W(d, -0.2), d && y === "diagram-fit" && W(d), d && y === "diagram-source") {
        const S = d.querySelector(".markdown-diagram-source");
        S && (S.hidden = !S.hidden);
      }
      if (d && y === "diagram-fullscreen" && ((z = d.requestFullscreen) == null || z.call(d)), d && y === "diagram-export-svg") {
        const S = d.querySelector("svg");
        S && Y(new Blob([new XMLSerializer().serializeToString(S)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    function Z() {
      var o;
      (o = $.value) == null || o.close();
    }
    return me(() => [t.text, t.labels], ([o]) => {
      n(o);
    }, { deep: !0 }), pe(() => {
      E();
    }), ge(() => window.clearTimeout(C)), (o, m) => (c(), f(P, null, [
      h("div", {
        ref_key: "rootRef",
        ref: g,
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
          src: M.value,
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
}, Pe = ["src"], Be = ["onClick"], Oe = ["data-tone", "open"], Ee = { key: 0 }, Ue = { key: 1 }, Ie = {
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
    function p(g) {
      return /fail|error|cancel|reject/iu.test(g) ? "danger" : /complete|success|done|approved/iu.test(g) ? "success" : /run|start|pending|wait/iu.test(g) ? "running" : "neutral";
    }
    function l(g) {
      return g.length > 12e3 ? `${g.slice(0, 12e3)}
…输出已截断` : g;
    }
    return (g, $) => (c(), f("section", {
      class: "cody-conversation",
      "data-variant": e.variant,
      "data-cody-component": "conversation-surface"
    }, [
      e.loading ? (c(), f("div", Ce, "正在同步对话…")) : e.entries.length === 0 ? (c(), f("div", xe, [
        H(g.$slots, "empty", {}, () => [
          $[1] || ($[1] = ae("开始这个需求的开发", -1))
        ])
      ])) : (c(!0), f(P, { key: 2 }, O(e.entries, (a) => {
        var M, L;
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
              (M = a.message.skills) != null && M.length ? (c(), f("ul", De, [
                (c(!0), f(P, null, O(a.message.skills, (C) => (c(), f("li", {
                  key: `${C.name}:${C.path}`
                }, "$" + A(C.displayName || C.name), 1))), 128))
              ])) : q("", !0),
              a.message.text ? (c(), f("div", Re, [
                H(g.$slots, "markdown", {
                  message: a.message
                }, () => [
                  j($e, {
                    text: a.message.text,
                    onOpenFile: $[0] || ($[0] = (C) => t("openFile", C))
                  }, null, 8, ["text"])
                ])
              ])) : q("", !0),
              (L = a.message.images) != null && L.length ? (c(), f("div", ze, [
                (c(!0), f(P, null, O(a.message.images, (C) => (c(), f("img", {
                  key: C,
                  src: C,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, Pe))), 128))
              ])) : q("", !0),
              a.message.text ? (c(), f("button", {
                key: 3,
                class: "cody-copy-button",
                type: "button",
                onClick: (C) => t("copy", a.message.text)
              }, "复制", 8, Be)) : q("", !0)
            ])
          ], 8, Le)) : a.kind === "tool" ? (c(), f("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": p(a.tool.status),
            open: p(a.tool.status) === "running"
          }, [
            h("summary", null, [
              $[2] || ($[2] = h("span", null, "⌁", -1)),
              h("strong", null, A(a.tool.title), 1),
              h("small", null, A(a.tool.status), 1)
            ]),
            h("p", null, A(a.tool.summary), 1),
            a.tool.details.length ? (c(), f("ul", Ee, [
              (c(!0), f(P, null, O(a.tool.details, (C) => (c(), f("li", { key: C }, A(C), 1))), 128))
            ])) : q("", !0),
            a.tool.output ? (c(), f("pre", Ue, A(l(a.tool.output)), 1)) : q("", !0)
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
      setup(k, { emit: i }) {
        return () => X("label", { class: "cody-composer-compact-control", title: k.label }, [
          X("select", { value: k.modelValue, disabled: k.disabled, "aria-label": k.label, onChange: (n) => i("update:modelValue", n.target.value) }, k.options.map((n) => X("option", { value: n.value }, n.label)))
        ]);
      }
    }), p = e, l = u, g = F(() => p.skills.filter((k) => !p.selectedSkills.includes(k.value))), $ = F(() => {
      var k;
      return ((k = p.permissionOptions.find((i) => i.value === p.selectedPermission)) == null ? void 0 : k.description) ?? "";
    }), a = F(() => p.isRunning && p.selectedSubmitMode === "guide" ? "发送引导" : p.isRunning ? "加入队列" : "发送");
    function M(k, i) {
      var n;
      return ((n = k.find((E) => E.value === i)) == null ? void 0 : n.label) ?? i;
    }
    function L(k) {
      k && !p.selectedSkills.includes(k) && l("update:selected-skills", [...p.selectedSkills, k]);
    }
    function C(k) {
      l("update:selected-skills", p.selectedSkills.filter((i) => i !== k));
    }
    return (k, i) => (c(), f("form", {
      class: "cody-composer",
      "data-variant": e.variant,
      "data-cody-component": "composer-surface",
      onSubmit: i[9] || (i[9] = J((n) => l("send"), ["prevent"]))
    }, [
      h("div", Fe, [
        e.selectedSkills.length ? (c(), f("div", je, [
          (c(!0), f(P, null, O(e.selectedSkills, (n) => (c(), f("span", {
            key: n,
            class: "cody-composer-chip"
          }, [
            ae(" $" + A(M(e.skills, n)) + " ", 1),
            h("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${M(e.skills, n)}`,
              onClick: (E) => C(n)
            }, "×", 8, Ne)
          ]))), 128))
        ])) : q("", !0),
        h("textarea", {
          value: e.draft,
          rows: "1",
          disabled: e.disabled,
          placeholder: e.placeholder,
          onInput: i[0] || (i[0] = (n) => l("update:draft", n.target.value)),
          onKeydown: i[1] || (i[1] = be(J((n) => l("send"), ["exact", "prevent"]), ["enter"]))
        }, null, 40, He),
        h("div", We, [
          H(k.$slots, "leading"),
          e.skills.length ? (c(), f("label", Ge, [
            i[11] || (i[11] = h("span", {
              class: "cody-composer-icon",
              "aria-hidden": "true"
            }, "✦", -1)),
            h("select", {
              value: "",
              disabled: e.disabled,
              "aria-label": "添加 Skill",
              onChange: i[2] || (i[2] = (n) => L(n.target.value))
            }, [
              i[10] || (i[10] = h("option", { value: "" }, "Skills", -1)),
              (c(!0), f(P, null, O(g.value, (n) => (c(), f("option", {
                key: n.value,
                value: n.value
              }, "$" + A(n.label), 9, Ye))), 128))
            ], 40, Xe)
          ])) : q("", !0),
          e.collaborationModes.length ? (c(), Q(U(t), {
            key: 1,
            label: "协作模式",
            "model-value": e.selectedCollaborationMode,
            options: e.collaborationModes,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": i[3] || (i[3] = (n) => l("update:collaboration-mode", n))
          }, null, 8, ["model-value", "options", "disabled"])) : q("", !0),
          j(U(t), {
            label: "提交策略",
            "model-value": e.selectedSubmitMode,
            options: e.submitModes,
            disabled: e.disabled,
            "onUpdate:modelValue": i[4] || (i[4] = (n) => l("update:submit-mode", n))
          }, null, 8, ["model-value", "options", "disabled"]),
          e.models.length ? (c(), Q(U(t), {
            key: 2,
            label: "模型",
            "model-value": e.selectedModel,
            options: e.models,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": i[5] || (i[5] = (n) => l("update:model", n))
          }, null, 8, ["model-value", "options", "disabled"])) : q("", !0),
          j(U(t), {
            label: "推理强度",
            "model-value": e.selectedReasoning,
            options: e.reasoningOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": i[6] || (i[6] = (n) => l("update:reasoning", n))
          }, null, 8, ["model-value", "options", "disabled"]),
          j(U(t), {
            label: "权限",
            "model-value": e.selectedPermission,
            options: e.permissionOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": i[7] || (i[7] = (n) => l("update:permission", n))
          }, null, 8, ["model-value", "options", "disabled"]),
          H(k.$slots, "controls"),
          h("div", Ke, [
            e.isRunning ? (c(), f("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: e.disabled,
              onClick: i[8] || (i[8] = (n) => l("stop"))
            }, "停止", 8, Ze)) : q("", !0),
            h("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: e.disabled || !e.draft.trim(),
              "aria-label": a.value
            }, "↑", 8, Je)
          ])
        ]),
        $.value ? (c(), f("p", Qe, A($.value), 1)) : q("", !0)
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
