import type { Parser } from './index.js';
export declare class FinalPlan {
    start: number | null;
    end: number | null;
    skipAll: boolean;
    skipReason: string;
    comment: string;
    constructor(skipAll: boolean, self: Parser);
}
