import { type ComposerImage } from '@codycodeagent/cody-web-core/composer';
import type { CodyComposerOption } from './types.js';
type __VLS_Props = {
    draft: string;
    disabled?: boolean;
    isRunning?: boolean;
    placeholder?: string;
    collaborationModes?: CodyComposerOption[];
    selectedCollaborationMode?: string;
    submitModes?: CodyComposerOption[];
    selectedSubmitMode?: string;
    models?: CodyComposerOption[];
    selectedModel?: string;
    reasoningOptions?: CodyComposerOption[];
    selectedReasoning?: string;
    permissionOptions?: CodyComposerOption[];
    selectedPermission?: string;
    skills?: CodyComposerOption[];
    selectedSkills?: string[];
    /** Product-owned uploads are passed back for shared preview, paste, and drag/drop UI. */
    images?: ComposerImage[];
    imageUploadEnabled?: boolean;
    isUploadingImages?: boolean;
    imageError?: string;
    /** Standalone preserves CodyWeb's dark canvas; embedded inherits the host workbench surface. */
    variant?: 'standalone' | 'embedded';
};
declare var __VLS_1: {}, __VLS_43: {};
type __VLS_Slots = {} & {
    leading?: (props: typeof __VLS_1) => any;
} & {
    controls?: (props: typeof __VLS_43) => any;
};
declare const __VLS_component: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    stop: () => any;
    "update:draft": (value: string) => any;
    "update:collaboration-mode": (value: string) => any;
    "update:submit-mode": (value: string) => any;
    "update:model": (value: string) => any;
    "update:reasoning": (value: string) => any;
    "update:permission": (value: string) => any;
    "update:selected-skills": (value: string[]) => any;
    "attach-images": (files: File[]) => any;
    "remove-image": (imageId: string) => any;
    send: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onStop?: (() => any) | undefined;
    "onUpdate:draft"?: ((value: string) => any) | undefined;
    "onUpdate:collaboration-mode"?: ((value: string) => any) | undefined;
    "onUpdate:submit-mode"?: ((value: string) => any) | undefined;
    "onUpdate:model"?: ((value: string) => any) | undefined;
    "onUpdate:reasoning"?: ((value: string) => any) | undefined;
    "onUpdate:permission"?: ((value: string) => any) | undefined;
    "onUpdate:selected-skills"?: ((value: string[]) => any) | undefined;
    "onAttach-images"?: ((files: File[]) => any) | undefined;
    "onRemove-image"?: ((imageId: string) => any) | undefined;
    onSend?: (() => any) | undefined;
}>, {
    placeholder: string;
    variant: "standalone" | "embedded";
    collaborationModes: CodyComposerOption[];
    selectedCollaborationMode: string;
    submitModes: CodyComposerOption[];
    selectedSubmitMode: string;
    models: CodyComposerOption[];
    selectedModel: string;
    reasoningOptions: CodyComposerOption[];
    selectedReasoning: string;
    permissionOptions: CodyComposerOption[];
    selectedPermission: string;
    skills: CodyComposerOption[];
    selectedSkills: string[];
    images: ComposerImage[];
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: __VLS_WithSlots<typeof __VLS_component, __VLS_Slots>;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
//# sourceMappingURL=CodyComposer.vue.d.ts.map