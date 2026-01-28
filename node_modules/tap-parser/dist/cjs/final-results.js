"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinalResults = void 0;
const final_plan_js_1 = require("./final-plan.js");
class FinalResults {
    constructor(skipAll, self) {
        this.ok = self.ok;
        this.count = self.count;
        this.pass = self.pass;
        this.fail = self.fail || 0;
        this.bailout = self.bailedOut || false;
        this.todo = self.todo || 0;
        this.skip = skipAll ? self.count : self.skip || 0;
        this.plan = new final_plan_js_1.FinalPlan(skipAll, self);
        this.failures = self.failures;
        this.time = self.time;
        if (self.passes)
            this.passes = self.passes;
    }
}
exports.FinalResults = FinalResults;
//# sourceMappingURL=final-results.js.map