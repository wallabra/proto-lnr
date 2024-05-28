extern crate fixed_trigonometry;

use self::fixed_trigonometry::{atan, cos, sin};
use crate::fixed::Num;
use std::fmt::{self, Display};
use std::ops::{Add, AddAssign, Div, DivAssign, Mul, MulAssign, Sub, SubAssign};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Vec2 {
    pub x: Num,
    pub y: Num,
}

impl Vec2 {
    pub const ZERO: Self = Self {
        x: Num::ZERO,
        y: Num::ZERO,
    };

    pub fn angle(&self) -> Num {
        atan::atan2(self.y, self.x)
    }

    pub fn length_sq(&self) -> Num {
        self.x * self.x + self.y * self.y
    }

    pub fn length(&self) -> Num {
        self.length_sq().sqrt()
    }

    pub fn norm(&self) -> Self {
        *self / self.length()
    }

    pub fn rescale(&self, by: Num) -> Self {
        self.norm() * by
    }

    pub fn shrink(&self, by: Num) -> Self {
        let len = self.length();
        if by > len {
            Self::ZERO
        } else {
            *self * ((len - by) / len)
        }
    }

    pub fn rotated(&self, by: Num) -> Self {
        let c = cos(by);
        let s = sin(by);

        Vec2 {
            x: self.x * c + self.y * -s,
            y: self.x * s + self.y * c,
        }
    }

    pub fn xy(x: Num, y: Num) -> Self {
        Self { x, y }
    }

    pub fn diagonal(coord: Num) -> Self {
        Self { x: coord, y: coord }
    }

    pub fn diagonal_len(len: Num) -> Self {
        Self::diagonal(len * Num::FRAC_1_SQRT_2)
    }

    pub fn polar(length: Num, angle: Num) -> Self {
        Vec2 {
            x: cos(angle) * length,
            y: sin(angle) * length,
        }
    }

    pub fn unit(angle: Num) -> Self {
        Vec2 {
            x: cos(angle),
            y: sin(angle),
        }
    }

    pub fn on_x(length: Num) -> Self {
        Vec2 {
            x: length,
            y: Num::ZERO,
        }
    }

    pub fn on_y(length: Num) -> Self {
        Vec2 {
            x: Num::ZERO,
            y: length,
        }
    }
}

impl Add for Vec2 {
    type Output = Self;

    fn add(self, other: Self) -> Self {
        Self {
            x: self.x + other.x,
            y: self.y + other.y,
        }
    }
}

impl Sub for Vec2 {
    type Output = Self;

    fn sub(self, other: Self) -> Self {
        Self {
            x: self.x - other.x,
            y: self.y - other.y,
        }
    }
}

impl Mul for Vec2 {
    type Output = Self;

    fn mul(self, other: Self) -> Self {
        Self {
            x: self.x * other.x,
            y: self.y * other.y,
        }
    }
}

impl Mul<Num> for Vec2 {
    type Output = Self;

    fn mul(self, scale: Num) -> Self {
        Self {
            x: self.x * scale,
            y: self.y * scale,
        }
    }
}

impl Div for Vec2 {
    type Output = Self;

    fn div(self, other: Self) -> Self {
        Self {
            x: self.x / other.x,
            y: self.y / other.y,
        }
    }
}

impl Div<Num> for Vec2 {
    type Output = Self;

    fn div(self, scale: Num) -> Self {
        Self {
            x: self.x / scale,
            y: self.y / scale,
        }
    }
}

impl AddAssign for Vec2 {
    fn add_assign(&mut self, other: Self) {
        self.x += other.x;
        self.y += other.y;
    }
}

impl SubAssign for Vec2 {
    fn sub_assign(&mut self, other: Self) {
        self.x -= other.x;
        self.y -= other.y;
    }
}

impl MulAssign for Vec2 {
    fn mul_assign(&mut self, other: Self) {
        self.x *= other.x;
        self.y *= other.y;
    }
}

impl DivAssign for Vec2 {
    fn div_assign(&mut self, other: Self) {
        self.x /= other.x;
        self.y /= other.y;
    }
}

impl MulAssign<Num> for Vec2 {
    fn mul_assign(&mut self, scale: Num) {
        self.x *= scale;
        self.y *= scale;
    }
}

impl DivAssign<Num> for Vec2 {
    fn div_assign(&mut self, scale: Num) {
        self.x /= scale;
        self.y /= scale;
    }
}

impl Default for Vec2 {
    fn default() -> Self {
        Self {
            x: Num::ZERO,
            y: Num::ZERO,
        }
    }
}

impl Display for Vec2 {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "<{}, {}>", self.x, self.y)?;
        fmt::Result::Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    macro_rules! assert_delta {
        ($x:expr, $y:expr) => {
            let delta = Num::from_num(0.01);
            if !($x - $y < delta || $y - $x < delta) {
                panic!();
            }
        };
    }

    #[test]
    fn vec_scale() {
        let vec = Vec2::on_x(Num::from_num(2.0));
        assert_eq!(vec * Num::from_num(3.0), Vec2::on_x(Num::from_num(6.0)));
    }

    #[test]
    fn vec_angle() {
        let vec = Vec2::diagonal(Num::from_num(1));
        assert_delta!(vec.angle(), Num::FRAC_PI_4);
    }
}
