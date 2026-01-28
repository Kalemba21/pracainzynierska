import { FinalPlan } from './final-plan.js';
export class FinalResults {
    ok;
    count;
    pass;
    fail;
    bailout;
    todo;
    skip;
    failures;
    time;
    passes;
    plan;
    constructor(skipAll, self) {
        this.ok = self.ok;
        this.count = self.count;
        this.pass = self.pass;
        this.fail = self.fail || 0;
        this.bailout = self.bailedOut || false;
        this.todo = self.todo || 0;
        this.skip = skipAll ? self.count : self.skip || 0;
        this.plan = new FinalPlan(skipAll, self);
        this.failures = self.failures;
        this.time = self.time;
        if (self.passes)
            this.passes = self.passes;
    }
}
//# sourceMappingURL=final-results.js.map