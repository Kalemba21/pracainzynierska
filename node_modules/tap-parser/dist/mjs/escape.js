// turn \ into \\ and # into \#, for stringifying back to TAP
export const esc = (str) => str.replace(/\\/g, '\\\\').replace(/#/g, '\\#').trim();
export const unesc = (str) => str
    .replace(/(\\\\)/g, '\u0000')
    .replace(/\\#/g, '#')
    .replace(/\u0000/g, '\\')
    .trim();
//# sourceMappingURL=escape.js.map