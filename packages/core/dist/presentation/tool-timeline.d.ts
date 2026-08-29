export type ToolStatusTone = 'success' | 'danger' | 'working' | 'neutral';
export declare const TOOL_OUTPUT_PREVIEW_LINE_COUNT = 80;
export declare const TOOL_OUTPUT_PREVIEW_MAX_CHARS = 12000;
/** Product-neutral shape required to present a Codex tool invocation. */
export type PresentationTool = {
    kind: string;
    title: string;
    status: string;
    summary: string;
    details: string[];
    output?: string;
    outputLabel?: string;
};
/** Minimal message contract used by timeline grouping. Product message types may add fields. */
export type PresentationMessage<TTool extends PresentationTool = PresentationTool> = {
    id: string;
    text: string;
    images?: string[];
    skills?: Array<{
        name: string;
        path: string;
    }>;
    tool?: TTool | null;
};
export type FileChangeMessageGroup<TMessage extends PresentationMessage = PresentationMessage> = {
    headId: string;
    messages: TMessage[];
    messageIds: string[];
    fileCount: number;
    updateCount: number;
    status: string;
};
export declare function isGroupableFileChangeMessage(message: PresentationMessage): boolean;
export declare function fileChangeMessageCount(message: PresentationMessage): number;
export declare function fileChangeMessageDetails(message: PresentationMessage): string[];
export declare function buildFileChangeMessageGroups<TMessage extends PresentationMessage>(messages: TMessage[]): Array<FileChangeMessageGroup<TMessage>>;
export declare function fileChangeCountLabel(count: number): string;
export declare function fileChangeUpdateLabel(count: number): string;
export declare function isToolFailureStatus(status: string): boolean;
export declare function formatToolStatus(status: string): string;
export declare function toolStatusTone(status: string): ToolStatusTone;
export declare function isToolTimelineExpandedByDefault(tool: PresentationTool): boolean;
export declare function isToolOutputTruncated(output: string, lineLimit?: number, charLimit?: number): boolean;
export declare function buildToolOutputPreview(output: string, lineLimit?: number, charLimit?: number): string;
export declare function toolOutputToggleLabel(isExpanded: boolean): string;
//# sourceMappingURL=tool-timeline.d.ts.map