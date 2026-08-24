import { defineComponent as $, openBlock as s, createElementBlock as o, renderSlot as k, createTextVNode as f, Fragment as g, renderList as y, createElementVNode as a, toDisplayString as l, createCommentVNode as c, unref as _, withModifiers as v, withKeys as C } from "vue";
function L(t) {
  return t.replace(/[&<>"']/gu, (r) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[r] ?? r);
}
function w(t) {
  return L(t).replace(/```([^\n]*)\n([\s\S]*?)```/gu, (m, d, n) => `<pre><code data-language="${d.trim()}">${n.trimEnd()}</code></pre>`).replace(/`([^`]+)`/gu, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/gu, "<strong>$1</strong>").replace(/\n/g, "<br>");
}
const x = {
  class: "cody-conversation",
  "data-cody-component": "conversation-surface"
}, B = {
  key: 0,
  class: "cody-conversation-loading",
  role: "status"
}, M = {
  key: 1,
  class: "cody-conversation-empty"
}, N = {
  key: 0,
  class: "cody-worked-divider"
}, S = ["data-role"], T = ["data-role"], E = { class: "cody-message-stack" }, H = { class: "cody-message-label" }, V = {
  key: 0,
  class: "cody-message-skills"
}, K = {
  key: 1,
  class: "cody-message-body"
}, R = ["innerHTML"], j = {
  key: 2,
  class: "cody-message-images"
}, q = ["src"], z = ["onClick"], A = ["data-tone", "open"], D = { key: 0 }, F = { key: 1 }, I = {
  key: 3,
  class: "cody-reasoning-card"
}, ee = /* @__PURE__ */ $({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean }
  },
  emits: ["copy"],
  setup(t, { emit: r }) {
    const u = r;
    function m(n) {
      return /fail|error|cancel|reject/iu.test(n) ? "danger" : /complete|success|done|approved/iu.test(n) ? "success" : /run|start|pending|wait/iu.test(n) ? "running" : "neutral";
    }
    function d(n) {
      return n.length > 12e3 ? `${n.slice(0, 12e3)}
…输出已截断` : n;
    }
    return (n, p) => (s(), o("section", x, [
      t.loading ? (s(), o("div", B, "正在同步对话…")) : t.entries.length === 0 ? (s(), o("div", M, [
        k(n.$slots, "empty", {}, () => [
          p[0] || (p[0] = f("开始这个需求的开发", -1))
        ])
      ])) : (s(!0), o(g, { key: 2 }, y(t.entries, (e) => {
        var b, h;
        return s(), o(g, {
          key: e.id
        }, [
          e.kind === "worked" ? (s(), o("div", N, [
            a("span", null, l(e.label), 1)
          ])) : e.kind === "message" ? (s(), o("article", {
            key: 1,
            class: "cody-message",
            "data-role": e.message.role
          }, [
            a("div", {
              class: "cody-message-identity",
              "data-role": e.message.role
            }, l(e.message.role === "user" ? "你" : "CW"), 9, T),
            a("div", E, [
              a("div", H, l(e.message.role === "user" ? "你" : e.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (b = e.message.skills) != null && b.length ? (s(), o("ul", V, [
                (s(!0), o(g, null, y(e.message.skills, (i) => (s(), o("li", {
                  key: `${i.name}:${i.path}`
                }, "$" + l(i.displayName || i.name), 1))), 128))
              ])) : c("", !0),
              e.message.text ? (s(), o("div", K, [
                k(n.$slots, "markdown", {
                  message: e.message
                }, () => [
                  a("div", {
                    class: "cody-markdown",
                    innerHTML: _(w)(e.message.text)
                  }, null, 8, R)
                ])
              ])) : c("", !0),
              (h = e.message.images) != null && h.length ? (s(), o("div", j, [
                (s(!0), o(g, null, y(e.message.images, (i) => (s(), o("img", {
                  key: i,
                  src: i,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, q))), 128))
              ])) : c("", !0),
              e.message.text ? (s(), o("button", {
                key: 3,
                class: "cody-copy-button",
                type: "button",
                onClick: (i) => u("copy", e.message.text)
              }, "复制", 8, z)) : c("", !0)
            ])
          ], 8, S)) : e.kind === "tool" ? (s(), o("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": m(e.tool.status),
            open: m(e.tool.status) === "running"
          }, [
            a("summary", null, [
              p[1] || (p[1] = a("span", null, "⌁", -1)),
              a("strong", null, l(e.tool.title), 1),
              a("small", null, l(e.tool.status), 1)
            ]),
            a("p", null, l(e.tool.summary), 1),
            e.tool.details.length ? (s(), o("ul", D, [
              (s(!0), o(g, null, y(e.tool.details, (i) => (s(), o("li", { key: i }, l(i), 1))), 128))
            ])) : c("", !0),
            e.tool.output ? (s(), o("pre", F, l(d(e.tool.output)), 1)) : c("", !0)
          ], 8, A)) : (s(), o("details", I, [
            a("summary", null, "✦ " + l(e.title || "推理过程"), 1),
            a("pre", null, l(e.text), 1)
          ]))
        ], 64);
      }), 128))
    ]));
  }
}), O = { class: "cody-composer-shell" }, W = ["value", "disabled", "placeholder"], G = { class: "cody-composer-controls" }, J = {
  key: 0,
  class: "cody-composer-pill"
}, P = {
  key: 1,
  class: "cody-composer-pill"
}, Q = {
  key: 2,
  class: "cody-composer-pill"
}, U = {
  key: 3,
  class: "cody-composer-pill"
}, X = ["disabled"], Y = ["disabled"], se = /* @__PURE__ */ $({
  __name: "CodyComposer",
  props: {
    draft: {},
    disabled: { type: Boolean },
    isRunning: { type: Boolean },
    placeholder: { default: "输入消息…" },
    modeLabel: {},
    modelLabel: {},
    reasoningLabel: {},
    permissionLabel: {}
  },
  emits: ["update:draft", "send", "stop"],
  setup(t, { emit: r }) {
    const u = r;
    return (m, d) => (s(), o("form", {
      class: "cody-composer",
      "data-cody-component": "composer-surface",
      onSubmit: d[3] || (d[3] = v((n) => u("send"), ["prevent"]))
    }, [
      a("div", O, [
        a("textarea", {
          value: t.draft,
          rows: "1",
          disabled: t.disabled,
          placeholder: t.placeholder,
          onInput: d[0] || (d[0] = (n) => u("update:draft", n.target.value)),
          onKeydown: d[1] || (d[1] = C(v((n) => u("send"), ["exact", "prevent"]), ["enter"]))
        }, null, 40, W),
        a("div", G, [
          k(m.$slots, "leading"),
          t.modeLabel ? (s(), o("span", J, l(t.modeLabel), 1)) : c("", !0),
          t.modelLabel ? (s(), o("span", P, l(t.modelLabel), 1)) : c("", !0),
          t.reasoningLabel ? (s(), o("span", Q, l(t.reasoningLabel), 1)) : c("", !0),
          t.permissionLabel ? (s(), o("span", U, l(t.permissionLabel), 1)) : c("", !0),
          k(m.$slots, "controls"),
          t.isRunning ? (s(), o("button", {
            key: 4,
            class: "cody-composer-stop",
            type: "button",
            disabled: t.disabled,
            onClick: d[2] || (d[2] = (n) => u("stop"))
          }, "停止", 8, X)) : (s(), o("button", {
            key: 5,
            class: "cody-composer-send",
            type: "submit",
            disabled: t.disabled || !t.draft.trim(),
            "aria-label": "发送"
          }, "↑", 8, Y))
        ])
      ])
    ], 32));
  }
});
export {
  se as CodyComposer,
  ee as CodyConversation,
  w as renderCodyMarkdown
};
