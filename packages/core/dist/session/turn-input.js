/** Builds the canonical Codex turn input sequence for every CodyWeb product. */
export function buildTurnUserInput(input) {
    const result = [];
    // The App Server attaches native Skill context in input order. Keep Skills
    // ahead of the user message so execution starts with that context available.
    for (const skill of input.skills ?? []) {
        const name = skill.name.trim();
        const path = skill.path.trim();
        if (name && path)
            result.push({ type: 'skill', name, path });
    }
    const text = input.text?.trim() ?? '';
    if (text)
        result.push({ type: 'text', text, text_elements: [] });
    for (const image of input.localImages ?? []) {
        const path = image.path.trim();
        if (path)
            result.push({ type: 'localImage', path, ...(image.detail ? { detail: image.detail } : {}) });
    }
    return result;
}
//# sourceMappingURL=turn-input.js.map