import { rwc } from "../util";

export interface Rarity {
	rarity: number | "always";
}

interface GuaranteedRarity {
	rarity: number;
}

/**
 * Picks one out of a list of part definitions based on rarity and available points.
 *
 * If the points are not sufficient for any of the defs, returns null.
 */
export function pickByRarity<T extends Rarity>(
	defs: T[],
	points: number | null = null,
	temperature = 0,
): T | null {
	const newDefs: (T & GuaranteedRarity)[] = defs.filter(
		(d) => d.rarity !== "always" && (points == null || d.rarity < points),
	) as (T & GuaranteedRarity)[];
	if (newDefs.length === 0) {
		return null;
	}
	return newDefs[
		rwc(
			newDefs.map((d, i) => {
				return { item: i, weight: 1 / d.rarity };
			}),
			temperature,
		)
	];
}
