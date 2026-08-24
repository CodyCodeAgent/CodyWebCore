import { defineComponent as w, openBlock as o, createElementBlock as d, renderSlot as S, createTextVNode as O, Fragment as y, renderList as f, createElementVNode as n, toDisplayString as r, createCommentVNode as b, unref as v, h as C, computed as M, withModifiers as x, withKeys as L, createBlock as B, createVNode as V } from "vue";
function N(e) {
  return e.replace(/[&<>"']/gu, (k) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[k] ?? k);
}
function U(e) {
  return N(e).replace(/```([^\n]*)\n([\s\S]*?)```/gu, (u, i, c) => `<pre><code data-language="${i.trim()}">${c.trimEnd()}</code></pre>`).replace(/`([^`]+)`/gu, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/gu, "<strong>$1</strong>").replace(/\n/g, "<br>");
}
const q = {
  class: "cody-conversation",
  "data-cody-component": "conversation-surface"
}, P = {
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
}, re = /* @__PURE__ */ w({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean }
  },
  emits: ["copy"],
  setup(e, { emit: k }) {
    const g = k;
    function u(c) {
      return /fail|error|cancel|reject/iu.test(c) ? "danger" : /complete|success|done|approved/iu.test(c) ? "success" : /run|start|pending|wait/iu.test(c) ? "running" : "neutral";
    }
    function i(c) {
      return c.length > 12e3 ? `${c.slice(0, 12e3)}
…输出已截断` : c;
    }
    return (c, p) => (o(), d("section", q, [
      e.loading ? (o(), d("div", P, "正在同步对话…")) : e.entries.length === 0 ? (o(), d("div", T, [
        S(c.$slots, "empty", {}, () => [
          p[0] || (p[0] = O("开始这个需求的开发", -1))
        ])
      ])) : (o(!0), d(y, { key: 2 }, f(e.entries, (t) => {
        var $, h;
        return o(), d(y, {
          key: t.id
        }, [
          t.kind === "worked" ? (o(), d("div", E, [
            n("span", null, r(t.label), 1)
          ])) : t.kind === "message" ? (o(), d("article", {
            key: 1,
            class: "cody-message",
            "data-role": t.message.role
          }, [
            n("div", {
              class: "cody-message-identity",
              "data-role": t.message.role
            }, r(t.message.role === "user" ? "你" : "CW"), 9, A),
            n("div", D, [
              n("div", K, r(t.message.role === "user" ? "你" : t.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              ($ = t.message.skills) != null && $.length ? (o(), d("ul", j, [
                (o(!0), d(y, null, f(t.message.skills, (m) => (o(), d("li", {
                  key: `${m.name}:${m.path}`
                }, "$" + r(m.displayName || m.name), 1))), 128))
              ])) : b("", !0),
              t.message.text ? (o(), d("div", z, [
                S(c.$slots, "markdown", {
                  message: t.message
                }, () => [
                  n("div", {
                    class: "cody-markdown",
                    innerHTML: v(U)(t.message.text)
                  }, null, 8, F)
                ])
              ])) : b("", !0),
              (h = t.message.images) != null && h.length ? (o(), d("div", I, [
                (o(!0), d(y, null, f(t.message.images, (m) => (o(), d("img", {
                  key: m,
                  src: m,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, W))), 128))
              ])) : b("", !0),
              t.message.text ? (o(), d("button", {
                key: 3,
                class: "cody-copy-button",
                type: "button",
                onClick: (m) => g("copy", t.message.text)
              }, "复制", 8, G)) : b("", !0)
            ])
          ], 8, H)) : t.kind === "tool" ? (o(), d("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": u(t.tool.status),
            open: u(t.tool.status) === "running"
          }, [
            n("summary", null, [
              p[1] || (p[1] = n("span", null, "⌁", -1)),
              n("strong", null, r(t.tool.title), 1),
              n("small", null, r(t.tool.status), 1)
            ]),
            n("p", null, r(t.tool.summary), 1),
            t.tool.details.length ? (o(), d("ul", Q, [
              (o(!0), d(y, null, f(t.tool.details, (m) => (o(), d("li", { key: m }, r(m), 1))), 128))
            ])) : b("", !0),
            t.tool.output ? (o(), d("pre", X, r(i(t.tool.output)), 1)) : b("", !0)
          ], 8, J)) : (o(), d("details", Y, [
            n("summary", null, "✦ " + r(t.title || "推理过程"), 1),
            n("pre", null, r(t.text), 1)
          ]))
        ], 64);
      }), 128))
    ]));
  }
}), Z = { class: "cody-composer-shell" }, _ = {
  key: 0,
  class: "cody-composer-selected",
  "aria-label": "Selected skills"
}, ee = ["disabled", "aria-label", "onClick"], le = ["value", "disabled", "placeholder"], se = { class: "cody-composer-controls" }, te = {
  key: 0,
  class: "cody-composer-compact-control cody-composer-skill-control",
  title: "为本轮显式选择 Skill"
}, oe = ["disabled"], de = ["value"], ae = { class: "cody-composer-actions" }, ne = ["disabled"], ie = ["disabled", "aria-label"], ue = {
  key: 1,
  class: "cody-composer-policy"
}, me = /* @__PURE__ */ w({
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
    selectedSkills: { default: () => [] }
  },
  emits: ["update:draft", "update:collaboration-mode", "update:submit-mode", "update:model", "update:reasoning", "update:permission", "update:selected-skills", "send", "stop"],
  setup(e, { emit: k }) {
    const g = w({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(a, { emit: l }) {
        return () => C("label", { class: "cody-composer-compact-control", title: a.label }, [
          C("select", { value: a.modelValue, disabled: a.disabled, "aria-label": a.label, onChange: (s) => l("update:modelValue", s.target.value) }, a.options.map((s) => C("option", { value: s.value }, s.label)))
        ]);
      }
    }), u = e, i = k, c = M(() => u.skills.filter((a) => !u.selectedSkills.includes(a.value))), p = M(() => {
      var a;
      return ((a = u.permissionOptions.find((l) => l.value === u.selectedPermission)) == null ? void 0 : a.description) ?? "";
    }), t = M(() => u.isRunning && u.selectedSubmitMode === "guide" ? "发送引导" : u.isRunning ? "加入队列" : "发送");
    function $(a, l) {
      var s;
      return ((s = a.find((R) => R.value === l)) == null ? void 0 : s.label) ?? l;
    }
    function h(a) {
      a && !u.selectedSkills.includes(a) && i("update:selected-skills", [...u.selectedSkills, a]);
    }
    function m(a) {
      i("update:selected-skills", u.selectedSkills.filter((l) => l !== a));
    }
    return (a, l) => (o(), d("form", {
      class: "cody-composer",
      "data-cody-component": "composer-surface",
      onSubmit: l[9] || (l[9] = x((s) => i("send"), ["prevent"]))
    }, [
      n("div", Z, [
        e.selectedSkills.length ? (o(), d("div", _, [
          (o(!0), d(y, null, f(e.selectedSkills, (s) => (o(), d("span", {
            key: s,
            class: "cody-composer-chip"
          }, [
            O(" $" + r($(e.skills, s)) + " ", 1),
            n("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${$(e.skills, s)}`,
              onClick: (R) => m(s)
            }, "×", 8, ee)
          ]))), 128))
        ])) : b("", !0),
        n("textarea", {
          value: e.draft,
          rows: "1",
          disabled: e.disabled,
          placeholder: e.placeholder,
          onInput: l[0] || (l[0] = (s) => i("update:draft", s.target.value)),
          onKeydown: l[1] || (l[1] = L(x((s) => i("send"), ["exact", "prevent"]), ["enter"]))
        }, null, 40, le),
        n("div", se, [
          S(a.$slots, "leading"),
          e.skills.length ? (o(), d("label", te, [
            l[11] || (l[11] = n("span", {
              class: "cody-composer-icon",
              "aria-hidden": "true"
            }, "✦", -1)),
            n("select", {
              value: "",
              disabled: e.disabled,
              "aria-label": "添加 Skill",
              onChange: l[2] || (l[2] = (s) => h(s.target.value))
            }, [
              l[10] || (l[10] = n("option", { value: "" }, "Skills", -1)),
              (o(!0), d(y, null, f(c.value, (s) => (o(), d("option", {
                key: s.value,
                value: s.value
              }, "$" + r(s.label), 9, de))), 128))
            ], 40, oe)
          ])) : b("", !0),
          e.collaborationModes.length ? (o(), B(v(g), {
            key: 1,
            label: "协作模式",
            "model-value": e.selectedCollaborationMode,
            options: e.collaborationModes,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": l[3] || (l[3] = (s) => i("update:collaboration-mode", s))
          }, null, 8, ["model-value", "options", "disabled"])) : b("", !0),
          V(v(g), {
            label: "提交策略",
            "model-value": e.selectedSubmitMode,
            options: e.submitModes,
            disabled: e.disabled,
            "onUpdate:modelValue": l[4] || (l[4] = (s) => i("update:submit-mode", s))
          }, null, 8, ["model-value", "options", "disabled"]),
          e.models.length ? (o(), B(v(g), {
            key: 2,
            label: "模型",
            "model-value": e.selectedModel,
            options: e.models,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": l[5] || (l[5] = (s) => i("update:model", s))
          }, null, 8, ["model-value", "options", "disabled"])) : b("", !0),
          V(v(g), {
            label: "推理强度",
            "model-value": e.selectedReasoning,
            options: e.reasoningOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": l[6] || (l[6] = (s) => i("update:reasoning", s))
          }, null, 8, ["model-value", "options", "disabled"]),
          V(v(g), {
            label: "权限",
            "model-value": e.selectedPermission,
            options: e.permissionOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": l[7] || (l[7] = (s) => i("update:permission", s))
          }, null, 8, ["model-value", "options", "disabled"]),
          S(a.$slots, "controls"),
          n("div", ae, [
            e.isRunning ? (o(), d("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: e.disabled,
              onClick: l[8] || (l[8] = (s) => i("stop"))
            }, "停止", 8, ne)) : b("", !0),
            n("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: e.disabled || !e.draft.trim(),
              "aria-label": t.value
            }, "↑", 8, ie)
          ])
        ]),
        p.value ? (o(), d("p", ue, r(p.value), 1)) : b("", !0)
      ])
    ], 32));
  }
});
export {
  me as CodyComposer,
  re as CodyConversation,
  U as renderCodyMarkdown
};
