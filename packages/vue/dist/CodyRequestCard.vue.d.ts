import type { ConversationRequest } from '@codycodeagent/cody-web-core/conversation';
type __VLS_Props = {
    request: ConversationRequest;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    resolveApproval: (requestId: string, decision: "accept" | "decline") => any;
    resolveQuestion: (requestId: string, answer: Record<string, {
        answers: string[];
    }>) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onResolveApproval?: ((requestId: string, decision: "accept" | "decline") => any) | undefined;
    onResolveQuestion?: ((requestId: string, answer: Record<string, {
        answers: string[];
    }>) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
//# sourceMappingURL=CodyRequestCard.vue.d.ts.map