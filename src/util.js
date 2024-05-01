//@flow

export const umod = (a, b) => (a % b + b) % b;
export const angDiff = (from, to) => umod(to - from + Math.PI, Math.PI * 2) - Math.PI;