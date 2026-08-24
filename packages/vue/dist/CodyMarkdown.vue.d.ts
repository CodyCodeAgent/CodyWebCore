import { type CodyMarkdownLabels } from './markdown.js';
type DiagramInput = {
    engine: 'mermaid' | 'plantuml';
    source: string;
    dark: boolean;
};
type __VLS_Props = {
    text: string;
    cwd?: string;
    labels?: CodyMarkdownLabels;
    dark?: boolean;
    renderDelay?: number;
    resolveAssetUrl?: (href: string) => string | undefined;
    renderDiagram?: (input: DiagramInput) => Promise<string | undefined>;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    openFile: (args_0: {
        path: string;
        line: number;
    }) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onOpenFile?: ((args_0: {
        path: string;
        line: number;
    }) => any) | undefined;
}>, {
    dark: boolean;
    renderDelay: number;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
//# sourceMappingURL=CodyMarkdown.vue.d.ts.map