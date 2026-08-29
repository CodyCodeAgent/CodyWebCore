import { previewToolOutput, toolStatusTone as conversationToolStatusTone } from '../conversation/index.js';
export const TOOL_OUTPUT_PREVIEW_LINE_COUNT = 80;
export const TOOL_OUTPUT_PREVIEW_MAX_CHARS = 12_000;
function fileChangeCountFromSummary(summary) {
    const match = summary.match(/\b(\d+)\s+files?\s+changed\b/iu);
    if (!match?.[1])
        return null;
    const count = Number(match[1]);
    return Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : null;
}
export function isGroupableFileChangeMessage(message) {
    return message.tool?.kind === 'fileChange'
        && message.text.trim().length === 0
        && (message.images?.length ?? 0) === 0
        && (message.skills?.length ?? 0) === 0;
}
export function fileChangeMessageCount(message) {
    if (message.tool?.kind !== 'fileChange')
        return 0;
    const summaryCount = fileChangeCountFromSummary(message.tool.summary);
    if (summaryCount !== null)
        return summaryCount;
    return message.tool.details.filter((detail) => !/^status\s*:/iu.test(detail.trim())).length;
}
export function fileChangeMessageDetails(message) {
    if (message.tool?.kind !== 'fileChange')
        return [];
    return message.tool.details.filter((detail) => !/^status\s*:/iu.test(detail.trim()));
}
function fileChangeGroupStatus(messages) {
    const statuses = messages
        .map((message) => message.tool?.status.trim() ?? '')
        .filter((status) => status.length > 0);
    const failed = statuses.find((status) => isToolFailureStatus(status));
    if (failed)
        return failed;
    const working = statuses.find((status) => toolStatusTone(status) === 'working');
    if (working)
        return working;
    return statuses.at(-1) ?? 'unknown';
}
function toFileChangeMessageGroup(messages) {
    return {
        headId: messages[0]?.id ?? '',
        messages,
        messageIds: messages.map((message) => message.id),
        fileCount: messages.reduce((total, message) => total + fileChangeMessageCount(message), 0),
        updateCount: messages.length,
        status: fileChangeGroupStatus(messages),
    };
}
export function buildFileChangeMessageGroups(messages) {
    const groups = [];
    let pending = [];
    const flush = () => {
        if (pending.length === 0)
            return;
        groups.push(toFileChangeMessageGroup(pending));
        pending = [];
    };
    for (const message of messages) {
        if (isGroupableFileChangeMessage(message)) {
            pending.push(message);
            continue;
        }
        flush();
    }
    flush();
    return groups;
}
export function fileChangeCountLabel(count) {
    const normalized = Math.max(0, Math.trunc(count));
    return `${String(normalized)} file${normalized === 1 ? '' : 's'}`;
}
export function fileChangeUpdateLabel(count) {
    const normalized = Math.max(0, Math.trunc(count));
    return `${String(normalized)} update${normalized === 1 ? '' : 's'}`;
}
export function isToolFailureStatus(status) {
    const normalized = status.trim().toLowerCase();
    return normalized.includes('fail')
        || normalized.includes('error')
        || normalized.includes('decline')
        || normalized.includes('cancel');
}
export function formatToolStatus(status) {
    const normalized = status.trim();
    if (!normalized)
        return 'unknown';
    return normalized
        .replace(/[-_]+/gu, ' ')
        .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
export function toolStatusTone(status) {
    const coreTone = conversationToolStatusTone(status);
    if (coreTone === 'running')
        return 'working';
    if (coreTone === 'success' || coreTone === 'danger')
        return coreTone;
    const normalized = status.trim().toLowerCase();
    if (!normalized)
        return 'neutral';
    if (isToolFailureStatus(normalized))
        return 'danger';
    if (/running|progress|pending|started/u.test(normalized))
        return 'working';
    if (/success|complete|done|applied/u.test(normalized))
        return 'success';
    return 'neutral';
}
export function isToolTimelineExpandedByDefault(tool) {
    return tool.kind !== 'fileChange';
}
export function isToolOutputTruncated(output, lineLimit = TOOL_OUTPUT_PREVIEW_LINE_COUNT, charLimit = TOOL_OUTPUT_PREVIEW_MAX_CHARS) {
    if (output.length > Math.max(Math.trunc(charLimit), 1))
        return true;
    const normalizedLineLimit = Math.max(Math.trunc(lineLimit), 1);
    return output.split(/\r\n|\r|\n/u).length > normalizedLineLimit;
}
export function buildToolOutputPreview(output, lineLimit = TOOL_OUTPUT_PREVIEW_LINE_COUNT, charLimit = TOOL_OUTPUT_PREVIEW_MAX_CHARS) {
    return previewToolOutput(output, lineLimit, charLimit).text;
}
export function toolOutputToggleLabel(isExpanded) {
    return isExpanded ? 'Show preview' : 'Show full output';
}
//# sourceMappingURL=tool-timeline.js.map