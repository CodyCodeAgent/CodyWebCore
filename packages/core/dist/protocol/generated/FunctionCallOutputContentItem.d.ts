/**
 * Responses API compatible content items that can be returned by a tool call.
 * This is a subset of ContentItem with the types we support as function call outputs.
 */
export type FunctionCallOutputContentItem = {
    "type": "input_text";
    text: string;
} | {
    "type": "input_image";
    image_url: string;
};
//# sourceMappingURL=FunctionCallOutputContentItem.d.ts.map