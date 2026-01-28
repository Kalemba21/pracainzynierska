"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lineType = exports.lineTypes = void 0;
exports.lineTypes = {
    testPoint: /^(not )?ok(?: ([0-9]+))?(?:(?: -)?( .*?))?(\{?)\n$/,
    pragma: /^pragma ([+-])([a-zA-Z0-9_-]+)\n$/,
    bailout: /^bail out!(.*)\n$/i,
    version: /^TAP version ([0-9]+)\n$/i,
    childVersion: /^(    )+TAP version ([0-9]+)\n$/i,
    plan: /^([0-9]+)\.\.([0-9]+)(?:\s+(?:#\s*(.*)))?\n$/,
    subtest: /^# Subtest(?:: (.*))?\n$/,
    subtestIndent: /^    # Subtest(?:: (.*))?\n$/,
    comment: /^\s*#.*\n$/,
};
const lineType = (line) => {
    for (let t in exports.lineTypes) {
        const match = line.match(exports.lineTypes[t]);
        if (match)
            return [t, match];
    }
    return null;
};
exports.lineType = lineType;
//# sourceMappingURL=line-type.js.map