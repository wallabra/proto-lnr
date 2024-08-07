declare module "array-counter" {
  type ArrayCount<T extends (string | number | symbol)[]> = {
    [key in T[number]]: number;
  }

  export default function arrayCounter<T extends string | number | symbol>(arrayToCount: T[]): ArrayCount<typeof arrayToCount>;
}
