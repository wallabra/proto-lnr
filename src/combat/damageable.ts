/**
 * A game object capable of taking damage.
 */
export interface Damageable {
	/**
	 * Take damage.
	 *
	 * deltaTime allows the damage to be interpreted as a continuous damage by
	 * underlying logic. It should NOT scale the damage taken - this must be
	 * done by the caller instead.
	 */
	takeDamage(damage: number, deltaTime?: number): void;

	/**
	 * Get how much damage this object already has.
	 */
	getDamage(): number;

	/**
	 * Get how much damage this object can receive before being destroyed.
	 */
	getMaxDamage(): number | null;
}

export function isDamageable(other: object): other is Damageable {
	return (
		"takeDamage" in other &&
		"getDamage" in other &&
		"getMaxDamage" in other &&
		typeof other.takeDamage === "function" &&
		typeof other.getDamage === "function" &&
		typeof other.getMaxDamage === "function"
	);
}

export function damageOutOfMax(damageable: Damageable): number {
	const maxDamage = damageable.getMaxDamage();
	if (maxDamage === null) return 0;

	return damageable.getDamage() / maxDamage;
}
