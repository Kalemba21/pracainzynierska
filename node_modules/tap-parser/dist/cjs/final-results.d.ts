import type { Result, TapError } from './result.js';
import { FinalPlan } from './final-plan.js';
import type { Parser } from './index.js';
export declare class FinalResults {
    ok: boolean;
    count: number;
    pass: number;
    fail: number;
    bailout: boolean | string;
    todo: number;
    skip: number;
    failures: TapError[];
    time: number | null;
    passes?: Result[];
    plan: FinalPlan;
    constructor(skipAll: boolean, self: Parser);
}
