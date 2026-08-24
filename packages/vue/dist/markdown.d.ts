export type CodyMarkdownLabels = {
    zoomOut: string;
    fit: string;
    zoomIn: string;
    source: string;
    fullscreen: string;
    rendering: (engine: string) => string;
    diagramAria: (engine: string) => string;
    wrap: string;
    scroll?: string;
    copy: string;
    save: string;
    dataTable: string;
    copyCsv: string;
    openFile: (path: string) => string;
    lineCount: (count: number) => string;
    expandCode: (count: number) => string;
    collapseCode: string;
};
export declare const DEFAULT_CODY_MARKDOWN_LABELS: CodyMarkdownLabels;
/** Renders safe, product-neutral Markdown. Raw HTML is intentionally disabled before sanitization. */
export declare function renderCodyMarkdown(source: string, labels?: CodyMarkdownLabels): string;
export declare function stabilizeStreamingMarkdown(value: string): string;
//# sourceMappingURL=markdown.d.ts.map