import type { CodyConversationEntry } from './types.js';
type __VLS_Props = {
    entries: CodyConversationEntry[];
    loading?: boolean;
    variant?: 'standalone' | 'embedded';
};
declare var __VLS_1: {}, __VLS_3: {
    message: import("@codycodeagent/cody-web-core/conversation", { with: { "resolution-mode": "import" } }).ConversationMessage;
}, __VLS_19: {
    request: import("@codycodeagent/cody-web-core/conversation", { with: { "resolution-mode": "import" } }).ConversationRequest;
};
type __VLS_Slots = {} & {
    empty?: (props: typeof __VLS_1) => any;
} & {
    markdown?: (props: typeof __VLS_3) => any;
} & {
    request?: (props: typeof __VLS_19) => any;
};
declare const __VLS_component: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    openFile: (args_0: {
        path: string;
        line: number;
    }) => any;
    copy: (text: string) => any;
    resolveApproval: (requestId: string, decision: "accept" | "decline") => any;
    resolveQuestion: (requestId: string, answer: Record<string, {
        answers: string[];
    }>) => any;
    retryMessage: (message: import("@codycodeagent/cody-web-core/conversation", { with: { "resolution-mode": "import" } }).ConversationMessage) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onOpenFile?: ((args_0: {
        path: string;
        line: number;
    }) => any) | undefined;
    onCopy?: ((text: string) => any) | undefined;
    onResolveApproval?: ((requestId: string, decision: "accept" | "decline") => any) | undefined;
    onResolveQuestion?: ((requestId: string, answer: Record<string, {
        answers: string[];
    }>) => any) | undefined;
    onRetryMessage?: ((message: import("@codycodeagent/cody-web-core/conversation", { with: { "resolution-mode": "import" } }).ConversationMessage) => any) | undefined;
}>, {
    variant: "standalone" | "embedded";
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: __VLS_WithSlots<typeof __VLS_component, __VLS_Slots>;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
//# sourceMappingURL=CodyConversation.vue.d.ts.map