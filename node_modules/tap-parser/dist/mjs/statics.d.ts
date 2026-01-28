import { ParserOptions } from './index.js';
export declare const parse: (str: string, options: ParserOptions) => [event: string, ...data: any[]][];
export declare const stringify: (msg: [event: string, ...data: any[]][], { flat, indent, id }: {
    flat?: boolean | undefined;
    indent?: string | undefined;
    id?: {
        (): number;
        current: number;
    } | undefined;
}) => string;
