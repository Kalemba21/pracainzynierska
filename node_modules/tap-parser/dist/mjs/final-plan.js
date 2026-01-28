export class FinalPlan {
    start;
    end;
    skipAll;
    skipReason;
    comment;
    constructor(skipAll, self) {
        this.start = self.planStart === -1 ? null : self.planStart;
        this.end = self.planStart === -1 ? null : self.planEnd;
        this.skipAll = skipAll;
        this.skipReason = skipAll ? self.planComment : '';
        this.comment = self.planComment || '';
    }
}
//# sourceMappingURL=final-plan.js.map