import { OPEN_BRACE_EOL } from './brace-patterns.js';
export const parseDirective = (line) => {
    if (!line.trim())
        return false;
    line = line.replace(OPEN_BRACE_EOL, '').trim();
    const time = line.match(/^time=((?:[1-9][0-9]*|0)(?:\.[0-9]+)?)(ms|s)$/i);
    if (time) {
        let n = +time[1];
        if (time[2] === 's') {
            // JS does weird things with floats.  Round it off a bit.
            n *= 1000000;
            n = Math.round(n);
            n /= 1000;
        }
        return ['time', n];
    }
    const type = line.match(/^(todo|skip)(?:\S*)\b(.*)$/i);
    if (!type)
        return false;
    // we know at this point it must be either 'todo' or 'skip',
    // in unknown upper/lower case
    return [type[1].toLowerCase(), type[2].trim() || true];
};
//# sourceMappingURL=parse-directive.js.map