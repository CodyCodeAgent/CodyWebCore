import type { ConfigEdit } from "./ConfigEdit";
export type ConfigBatchWriteParams = {
    edits: Array<ConfigEdit>;
    /**
     * Path to the config file to write; defaults to the user's `config.toml` when omitted.
     */
    filePath?: string | null;
    expectedVersion?: string | null;
};
//# sourceMappingURL=ConfigBatchWriteParams.d.ts.map