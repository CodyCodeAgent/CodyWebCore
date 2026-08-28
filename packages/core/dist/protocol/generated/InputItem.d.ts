import type { TextElement } from "./TextElement";
export type InputItem = {
    "type": "text";
    "data": {
        text: string;
        /**
         * UI-defined spans within `text` used to render or persist special elements.
         */
        text_elements: Array<TextElement>;
    };
} | {
    "type": "image";
    "data": {
        image_url: string;
    };
} | {
    "type": "localImage";
    "data": {
        path: string;
    };
};
//# sourceMappingURL=InputItem.d.ts.map