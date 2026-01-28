"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinalPlan = void 0;
class FinalPlan {
    constructor(skipAll, self) {
        this.start = self.planStart === -1 ? null : self.planStart;
        this.end = self.planStart === -1 ? null : self.planEnd;
        this.skipAll = skipAll;
        this.skipReason = skipAll ? self.planComment : '';
        this.comment = self.planComment || '';
    }
}
exports.FinalPlan = FinalPlan;
//# sourceMappingURL=final-plan.js.map