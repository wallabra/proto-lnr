extern crate itertools;

use self::itertools::izip;
use crate::fixed::Num;
use crate::vector::Vec2;

fn surface(radius: Num) -> Num {
    radius * radius * (Num::PI * 4)
}

fn volume(radius: Num) -> Num {
    radius * radius * (Num::FRAC_PI_3 * 4)
}

pub struct Physics {
    pos: Vec<Vec2>,
    vel: Vec<Vec2>,
    height: Vec<Num>,
    height_vel: Vec<Num>,
    height_accel: Vec<Num>,
    radius: Vec<Num>,
    surface: Vec<Num>,
    volume: Vec<Num>,
    angle: Vec<Num>,
    ang_vel: Vec<Num>,
    ang_accel: Vec<Num>,
    weight: Vec<Num>,
    drag: Vec<Num>,
    friction: Vec<Num>,
    accel: Vec<Vec2>,
    torque: Vec<Num>,
    force: Vec<Vec2>,
    height_force: Vec<Num>,
}

impl Physics {
    pub fn get_position(&self, handle: usize) -> Vec2 {
        self.pos[handle]
    }

    pub fn get_velocity(&self, handle: usize) -> Vec2 {
        self.vel[handle]
    }

    pub fn phys_vel(&mut self, delta_time: Num) {
        izip!(self.pos.iter_mut(), self.vel.iter()).for_each(|(pos, vel)| {
            *pos += *vel * delta_time;
        });
    }

    pub fn update_geometry(&mut self, idx: usize) {
        let radius = self.radius[idx];
        self.surface[idx] = surface(radius);
        self.volume[idx] = volume(radius);
    }

    pub fn phys_angle(&mut self, delta_time: Num) {
        izip!(self.angle.iter_mut(), self.ang_vel.iter_mut()).for_each(|(ang, ang_vel)| {
            *ang += *ang_vel * delta_time;
        });
    }

    pub fn phys_force(&mut self, delta_time: Num) {
        let frac_delta_time_2 = delta_time / 2;

        izip!(self.accel.iter_mut(), self.force.iter(), self.weight.iter()).for_each(
            |(accel, force, weight)| {
                *accel += *force / *weight;
            },
        );
        izip!(self.vel.iter_mut(), self.accel.iter()).for_each(|(vel, force)| {
            *vel += *force * delta_time;
        });
        izip!(self.pos.iter_mut(), self.accel.iter()).for_each(|(pos, force)| {
            *pos += *force * frac_delta_time_2;
        });
        self.force.fill(Vec2::ZERO);
        self.accel.fill(Vec2::ZERO);

        izip!(
            self.height_accel.iter_mut(),
            self.height_force.iter(),
            self.weight.iter()
        )
        .for_each(|(accel, force, weight)| {
            *accel += *force / *weight;
        });
        izip!(self.height_vel.iter_mut(), self.height_accel.iter()).for_each(|(vel, force)| {
            *vel += *force * delta_time;
        });
        izip!(self.height.iter_mut(), self.height_accel.iter()).for_each(|(pos, force)| {
            *pos += *force * frac_delta_time_2;
        });
        self.height_accel.fill(Num::ZERO);

        izip!(
            self.torque.iter(),
            self.ang_accel.iter_mut(),
            self.weight.iter()
        )
        .for_each(|(torque, accel, weight)| {
            *accel += *torque / *weight;
        });
        izip!(self.ang_vel.iter_mut(), self.ang_accel.iter()).for_each(|(vel, accel)| {
            *vel += *accel * delta_time;
        });
        izip!(self.angle.iter_mut(), self.ang_accel.iter()).for_each(|(ang, accel)| {
            *ang += *accel * frac_delta_time_2;
        });
        self.torque.fill(Num::ZERO);
        self.ang_accel.fill(Num::ZERO);
    }

    pub fn phys_drag(&mut self, delta_time: Num) {
        izip!(
            self.force.iter_mut(),
            self.vel.iter(),
            self.drag.iter(),
            self.surface.iter()
        )
        .for_each(|(force, vel, drag, surf)| {
            let drag = *vel * *drag * delta_time * (*surf / 3);
            *force -= drag;
        });
    }

    pub fn phys_friction(&mut self, delta_time: Num) {
        izip!(
            self.accel.iter_mut(),
            self.friction.iter(),
            self.surface.iter()
        )
        .for_each(|(accel, fric, surf)| *accel = accel.shrink(*fric * delta_time * (surf / 3)));
    }

    pub fn tick_phys(&mut self, delta_time: f64) {
        let delta_time_num = Num::from_num(delta_time);
        self.phys_drag(delta_time_num);
        self.phys_friction(delta_time_num);
        self.phys_force(delta_time_num);
        self.phys_vel(delta_time_num);
        self.phys_angle(delta_time_num);
    }
}
