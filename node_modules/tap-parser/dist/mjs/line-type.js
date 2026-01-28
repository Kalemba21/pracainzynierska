export const lineTypes = {
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
export const lineType = (line) => {
    for (let t in lineTypes) {
        const match = line.match(lineTypes[t]);
        if (match)
            return [t, match];
    }
    return null;
};
//# sourceMappingURL=line-type.js.map