import { defineComponent as w, openBlock as o, createElementBlock as d, renderSlot as S, createTextVNode as O, Fragment as p, renderList as f, createElementVNode as n, toDisplayString as r, createCommentVNode as b, unref as y, h as C, computed as M, withModifiers as x, withKeys as L, createBlock as B, createVNode as V } from "vue";
function N(e) {
  return e.replace(/[&<>"']/gu, (v) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[v] ?? v);
}
function U(e) {
  return N(e).replace(/```([^\n]*)\n([\s\S]*?)```/gu, (u, i, c) => `<pre><code data-language="${i.trim()}">${c.trimEnd()}</code></pre>`).replace(/`([^`]+)`/gu, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/gu, "<strong>$1</strong>").replace(/\n/g, "<br>");
}
const q = ["data-variant"], P = {
  key: 0,
  class: "cody-conversation-loading",
  role: "status"
}, T = {
  key: 1,
  class: "cody-conversation-empty"
}, E = {
  key: 0,
  class: "cody-worked-divider"
}, H = ["data-role"], A = ["data-role"], D = { class: "cody-message-stack" }, K = { class: "cody-message-label" }, j = {
  key: 0,
  class: "cody-message-skills"
}, z = {
  key: 1,
  class: "cody-message-body"
}, F = ["innerHTML"], I = {
  key: 2,
  class: "cody-message-images"
}, W = ["src"], G = ["onClick"], J = ["data-tone", "open"], Q = { key: 0 }, X = { key: 1 }, Y = {
  key: 3,
  class: "cody-reasoning-card"
}, me = /* @__PURE__ */ w({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy"],
  setup(e, { emit: v }) {
    const g = v;
    function u(c) {
      return /fail|error|cancel|reject/iu.test(c) ? "danger" : /complete|success|done|approved/iu.test(c) ? "success" : /run|start|pending|wait/iu.test(c) ? "running" : "neutral";
    }
    function i(c) {
      return c.length > 12e3 ? `${c.slice(0, 12e3)}
…输出已截断` : c;
    }
    return (c, k) => (o(), d("section", {
      class: "cody-conversation",
      "data-variant": e.variant,
      "data-cody-component": "conversation-surface"
    }, [
      e.loading ? (o(), d("div", P, "正在同步对话…")) : e.entries.length === 0 ? (o(), d("div", T, [
        S(c.$slots, "empty", {}, () => [
          k[0] || (k[0] = O("开始这个需求的开发", -1))
        ])
      ])) : (o(!0), d(p, { key: 2 }, f(e.entries, (s) => {
        var $, h;
        return o(), d(p, {
          key: s.id
        }, [
          s.kind === "worked" ? (o(), d("div", E, [
            n("span", null, r(s.label), 1)
          ])) : s.kind === "message" ? (o(), d("article", {
            key: 1,
            class: "cody-message",
            "data-role": s.message.role
          }, [
            n("div", {
              class: "cody-message-identity",
              "data-role": s.message.role
            }, r(s.message.role === "user" ? "你" : "CW"), 9, A),
            n("div", D, [
              n("div", K, r(s.message.role === "user" ? "你" : s.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              ($ = s.message.skills) != null && $.length ? (o(), d("ul", j, [
                (o(!0), d(p, null, f(s.message.skills, (m) => (o(), d("li", {
                  key: `${m.name}:${m.path}`
                }, "$" + r(m.displayName || m.name), 1))), 128))
              ])) : b("", !0),
              s.message.text ? (o(), d("div", z, [
                S(c.$slots, "markdown", {
                  message: s.message
                }, () => [
                  n("div", {
                    class: "cody-markdown",
                    innerHTML: y(U)(s.message.text)
                  }, null, 8, F)
                ])
              ])) : b("", !0),
              (h = s.message.images) != null && h.length ? (o(), d("div", I, [
                (o(!0), d(p, null, f(s.message.images, (m) => (o(), d("img", {
                  key: m,
                  src: m,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, W))), 128))
              ])) : b("", !0),
              s.message.text ? (o(), d("button", {
                key: 3,
                class: "cody-copy-button",
                type: "button",
                onClick: (m) => g("copy", s.message.text)
              }, "复制", 8, G)) : b("", !0)
            ])
          ], 8, H)) : s.kind === "tool" ? (o(), d("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": u(s.tool.status),
            open: u(s.tool.status) === "running"
          }, [
            n("summary", null, [
              k[1] || (k[1] = n("span", null, "⌁", -1)),
              n("strong", null, r(s.tool.title), 1),
              n("small", null, r(s.tool.status), 1)
            ]),
            n("p", null, r(s.tool.summary), 1),
            s.tool.details.length ? (o(), d("ul", Q, [
              (o(!0), d(p, null, f(s.tool.details, (m) => (o(), d("li", { key: m }, r(m), 1))), 128))
            ])) : b("", !0),
            s.tool.output ? (o(), d("pre", X, r(i(s.tool.output)), 1)) : b("", !0)
          ], 8, J)) : (o(), d("details", Y, [
            n("summary", null, "✦ " + r(s.title || "推理过程"), 1),
            n("pre", null, r(s.text), 1)
          ]))
        ], 64);
      }), 128))
    ], 8, q));
  }
}), Z = ["data-variant"], _ = { class: "cody-composer-shell" }, ee = {
  key: 0,
  class: "cody-composer-selected",
  "aria-label": "Selected skills"
}, le = ["disabled", "aria-label", "onClick"], te = ["value", "disabled", "placeholder"], se = { class: "cody-composer-controls" }, oe = {
  key: 0,
  class: "cody-composer-compact-control cody-composer-skill-control",
  title: "为本轮显式选择 Skill"
}, de = ["disabled"], ae = ["value"], ne = { class: "cody-composer-actions" }, ie = ["disabled"], ue = ["disabled", "aria-label"], ce = {
  key: 1,
  class: "cody-composer-policy"
}, be = /* @__PURE__ */ w({
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
  setup(e, { emit: v }) {
    const g = w({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(a, { emit: l }) {
        return () => C("label", { class: "cody-composer-compact-control", title: a.label }, [
          C("select", { value: a.modelValue, disabled: a.disabled, "aria-label": a.label, onChange: (t) => l("update:modelValue", t.target.value) }, a.options.map((t) => C("option", { value: t.value }, t.label)))
        ]);
      }
    }), u = e, i = v, c = M(() => u.skills.filter((a) => !u.selectedSkills.includes(a.value))), k = M(() => {
      var a;
      return ((a = u.permissionOptions.find((l) => l.value === u.selectedPermission)) == null ? void 0 : a.description) ?? "";
    }), s = M(() => u.isRunning && u.selectedSubmitMode === "guide" ? "发送引导" : u.isRunning ? "加入队列" : "发送");
    function $(a, l) {
      var t;
      return ((t = a.find((R) => R.value === l)) == null ? void 0 : t.label) ?? l;
    }
    function h(a) {
      a && !u.selectedSkills.includes(a) && i("update:selected-skills", [...u.selectedSkills, a]);
    }
    function m(a) {
      i("update:selected-skills", u.selectedSkills.filter((l) => l !== a));
    }
    return (a, l) => (o(), d("form", {
      class: "cody-composer",
      "data-variant": e.variant,
      "data-cody-component": "composer-surface",
      onSubmit: l[9] || (l[9] = x((t) => i("send"), ["prevent"]))
    }, [
      n("div", _, [
        e.selectedSkills.length ? (o(), d("div", ee, [
          (o(!0), d(p, null, f(e.selectedSkills, (t) => (o(), d("span", {
            key: t,
            class: "cody-composer-chip"
          }, [
            O(" $" + r($(e.skills, t)) + " ", 1),
            n("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${$(e.skills, t)}`,
              onClick: (R) => m(t)
            }, "×", 8, le)
          ]))), 128))
        ])) : b("", !0),
        n("textarea", {
          value: e.draft,
          rows: "1",
          disabled: e.disabled,
          placeholder: e.placeholder,
          onInput: l[0] || (l[0] = (t) => i("update:draft", t.target.value)),
          onKeydown: l[1] || (l[1] = L(x((t) => i("send"), ["exact", "prevent"]), ["enter"]))
        }, null, 40, te),
        n("div", se, [
          S(a.$slots, "leading"),
          e.skills.length ? (o(), d("label", oe, [
            l[11] || (l[11] = n("span", {
              class: "cody-composer-icon",
              "aria-hidden": "true"
            }, "✦", -1)),
            n("select", {
              value: "",
              disabled: e.disabled,
              "aria-label": "添加 Skill",
              onChange: l[2] || (l[2] = (t) => h(t.target.value))
            }, [
              l[10] || (l[10] = n("option", { value: "" }, "Skills", -1)),
              (o(!0), d(p, null, f(c.value, (t) => (o(), d("option", {
                key: t.value,
                value: t.value
              }, "$" + r(t.label), 9, ae))), 128))
            ], 40, de)
          ])) : b("", !0),
          e.collaborationModes.length ? (o(), B(y(g), {
            key: 1,
            label: "协作模式",
            "model-value": e.selectedCollaborationMode,
            options: e.collaborationModes,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": l[3] || (l[3] = (t) => i("update:collaboration-mode", t))
          }, null, 8, ["model-value", "options", "disabled"])) : b("", !0),
          V(y(g), {
            label: "提交策略",
            "model-value": e.selectedSubmitMode,
            options: e.submitModes,
            disabled: e.disabled,
            "onUpdate:modelValue": l[4] || (l[4] = (t) => i("update:submit-mode", t))
          }, null, 8, ["model-value", "options", "disabled"]),
          e.models.length ? (o(), B(y(g), {
            key: 2,
            label: "模型",
            "model-value": e.selectedModel,
            options: e.models,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": l[5] || (l[5] = (t) => i("update:model", t))
          }, null, 8, ["model-value", "options", "disabled"])) : b("", !0),
          V(y(g), {
            label: "推理强度",
            "model-value": e.selectedReasoning,
            options: e.reasoningOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": l[6] || (l[6] = (t) => i("update:reasoning", t))
          }, null, 8, ["model-value", "options", "disabled"]),
          V(y(g), {
            label: "权限",
            "model-value": e.selectedPermission,
            options: e.permissionOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": l[7] || (l[7] = (t) => i("update:permission", t))
          }, null, 8, ["model-value", "options", "disabled"]),
          S(a.$slots, "controls"),
          n("div", ne, [
            e.isRunning ? (o(), d("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: e.disabled,
              onClick: l[8] || (l[8] = (t) => i("stop"))
            }, "停止", 8, ie)) : b("", !0),
            n("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: e.disabled || !e.draft.trim(),
              "aria-label": s.value
            }, "↑", 8, ue)
          ])
        ]),
        k.value ? (o(), d("p", ce, r(k.value), 1)) : b("", !0)
      ])
    ], 40, Z));
  }
});
export {
  be as CodyComposer,
  me as CodyConversation,
  U as renderCodyMarkdown
};
