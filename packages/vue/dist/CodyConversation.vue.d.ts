import type { CodyConversationEntry } from './types.js';
type __VLS_Props = {
    entries: CodyConversationEntry[];
    loading?: boolean;
    variant?: 'standalone' | 'embedded';
};
declare var __VLS_1: {}, __VLS_3: {
    message: import("./types.js", { with: { "resolution-mode": "import" } }).CodyMessage;
};
type __VLS_Slots = {} & {
    empty?: (props: typeof __VLS_1) => any;
} & {
    markdown?: (props: typeof __VLS_3) => any;
};
declare const __VLS_component: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    openFile: (args_0: {
        path: string;
        line: number;
    }) => any;
    copy: (text: string) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onOpenFile?: ((args_0: {
        path: string;
        line: number;
    }) => any) | undefined;
    onCopy?: ((text: string) => any) | undefined;
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