export interface Damageable {
  takeDamage(damage: number): void;
  getDamage(): number;
  getMaxDamage(): number;
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
  return damageable.getDamage() / damageable.getMaxDamage();
}
