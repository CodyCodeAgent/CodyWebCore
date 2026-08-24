type __VLS_Props = {
    draft: string;
    disabled?: boolean;
    isRunning?: boolean;
    placeholder?: string;
    modeLabel?: string;
    modelLabel?: string;
    reasoningLabel?: string;
    permissionLabel?: string;
};
declare var __VLS_1: {}, __VLS_3: {};
type __VLS_Slots = {} & {
    leading?: (props: typeof __VLS_1) => any;
} & {
    controls?: (props: typeof __VLS_3) => any;
};
declare const __VLS_component: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    stop: () => any;
    "update:draft": (value: string) => any;
    send: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onStop?: (() => any) | undefined;
    "onUpdate:draft"?: ((value: string) => any) | undefined;
    onSend?: (() => any) | undefined;
}>, {
    placeholder: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: __VLS_WithSlots<typeof __VLS_component, __VLS_Slots>;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
//# sourceMappingURL=CodyComposer.vue.d.ts.map