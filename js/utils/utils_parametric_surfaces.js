import {convert_z_up_array_to_y_up_array, get_default_lil_gui, spawn_line_specific} from "./utils_three.js";
import {
    add_matrix_matrix,
    cross_product,
    mul_matrix_scalar,
    normalized_matrix,
    sub_matrix_matrix
} from "./utils_math.js";

export class ParametricSurfaceBaseClass {
    constructor() {
        if (new.target === ParametricSurfaceBaseClass) {
            throw new Error("ParametricSurfaceBaseClass is a template class and cannot be instantiated directly.");
        }

        this.raw_parametric_function = this.get_raw_parametric_function();
        this.raw_parametric_function_z_up = this.get_raw_parametric_function_z_up();
    }

    // returns a function that takes in two parameters (u and v) that both vary on the range 0-1 and returns a
    // point in space [x, y, z].
    get_raw_parametric_function() {
        throw new Error("Method 'get_raw_parametric_function()' must be implemented in the derived class.");
    }

    get_raw_parametric_function_z_up() {
        return (u, v) => {
            return convert_z_up_array_to_y_up_array(this.raw_parametric_function(u, v));
        }
    }

    get_three_parametric_function() {
        return (u, v, target) => {
            let point = this.raw_parametric_function_z_up(u, v);
            target.set(point[0], point[1], point[2]);
        }
    }

    get_surface_spanning_vectors_at_point(u, v) {
        let uu = u + 0.0001;
        let vv = v + 0.0001;

        let point = this.raw_parametric_function(u, v);
        let uu_point = this.raw_parametric_function(uu, v);
        let vv_point = this.raw_parametric_function(u, vv);

        let a1 = normalized_matrix(sub_matrix_matrix(uu_point, point));
        let a2 = normalized_matrix(sub_matrix_matrix(vv_point, point));

        return [a1, a2];
    }

    get_surface_normal_vector_at_point(u, v) {
        let [a1, a2] = this.get_surface_spanning_vectors_at_point(u, v);

        return cross_product(a1, a2);
    }

    draw_static_curves(scene, num_us=30, num_vs=30, color=0x555555, opacity=0.3) {
        let width = 0.002;
        let num_samples_per = 75;
        for(let i = 0; i < num_us; i++) {
            for(let j = 0; j < num_samples_per; j++) {
                let u = i / num_us;
                let v_curr = j / num_samples_per;
                let v_next = (j+1) / num_samples_per;

                let p1 = this.raw_parametric_function(u, v_curr);
                let p2 = this.raw_parametric_function(u, v_next);

                spawn_line_specific(scene, p1, p2, false, width, color, opacity);
            }
        }

        for(let i = 0; i < num_samples_per; i++) {
            for(let j = 0; j < num_vs; j++) {
                let u_curr = i / num_samples_per;
                let u_next = (i+1) / num_samples_per;
                let v = j / num_vs;

                let p1 = this.raw_parametric_function(u_curr, v);
                let p2 = this.raw_parametric_function(u_next, v);

                spawn_line_specific(scene, p1, p2, false, width, color, opacity);
            }
        }
    }
}

export class ParametricSurfaceThreeVisualizer {
    constructor(parametric_surface) {
        this.parametric_surface = parametric_surface;
        this.settings = {
            u: 0.5,
            v: 0.5,
            draw_tangent_space: false,
            tangent_space_vector_length: 0.25
        };
        let gui = get_default_lil_gui();
        gui.add(this.settings, 'u', 0, 1).name('u');
        gui.add(this.settings, 'v', 0, 1).name('v');
        gui.add(this.settings, 'draw_tangent_space').name('Draw Tangent Space');
        gui.add(this.settings, 'tangent_space_vector_length', 0.1, 1.0).name('Tangent Vec. Size');
        this.gui = gui;
    }

    three_loop_function(three_engine) {
        let point = this.parametric_surface.raw_parametric_function(this.settings.u, this.settings.v);
        three_engine.draw_debug_sphere(point, 0.04, 0x00eeff);

        if (this.settings.draw_tangent_space) {
            let ss = this.parametric_surface.get_surface_spanning_vectors_at_point(this.settings.u, this.settings.v);
            three_engine.draw_debug_vector(point, add_matrix_matrix(point, mul_matrix_scalar(ss[0], this.settings.tangent_space_vector_length)), 0.005, undefined, 0x777788);
            three_engine.draw_debug_vector(point, add_matrix_matrix(point, mul_matrix_scalar(ss[1], this.settings.tangent_space_vector_length)), 0.005, undefined, 0x777788);
        }
    }
}

export class ParametricSurfaceSphere extends ParametricSurfaceBaseClass {
    // r1 is distance from center of tube to center of torus
    // r2 is radius of the tube
    constructor(r = 1) {
        super();
        this.r = 1;
    }

    get_raw_parametric_function() {
        return (u, v) => {
            u *= Math.PI * 2; // u ranges from 0 to 2π
            v *= Math.PI * 2; // v ranges from 0 to 2π

            const x = this.r*Math.sin(u)*Math.cos(v);
            const y = this.r*Math.sin(u)*Math.sin(v);
            const z = this.r*Math.cos(u);

            return [x, y, z];
        }
    }
}

export class ParametricSurfaceTorus extends ParametricSurfaceBaseClass {
    // r1 is distance from center of tube to center of torus
    // r2 is radius of the tube
    constructor(r1 = 2, r2 = 0.3) {
        super();
        this.r1 = r1;
        this.r2 = r2;
    }

    get_raw_parametric_function() {
        return (u, v) => {
            u *= Math.PI * 2; // u ranges from 0 to 2π
            v *= Math.PI * 2; // v ranges from 0 to 2π

            const x = (this.r1 + this.r2 * Math.cos(v)) * Math.cos(u);
            const y = (this.r1 + this.r2 * Math.cos(v)) * Math.sin(u);
            const z = this.r2 * Math.sin(v);

            return [x, y, z];
        }
    }
}

export class ParametricSurfaceWaves extends ParametricSurfaceBaseClass {
    constructor(w=15, h=15) {
        super();
        this.w = w;
        this.h = h;
    }

    get_raw_parametric_function() {
        return (u, v) => {
            u -= 0.5;
            v -= 0.5;

            u *= this.h;
            v *= this.w;

            const x = u
            const y = v

            const z = Math.cos(u) + Math.sin(v);

            return [x, y, z];
        }
    }
}

export class ParametricSurfaceMobiusStrip extends ParametricSurfaceBaseClass {
    constructor() {
        super();
    }

    get_raw_parametric_function() {
        return (u, v) => {
            u -= 0.5;
            u *= 2.0;
            u *= Math.PI;
            v -= 0.5;
            v *= 2.0;

            const x = Math.cos(u)*(2 + v*Math.cos(u/2));
            const y = Math.sin(u)*(2 + v*Math.cos(u/2));
            const z = v*Math.sin(u/2);

            return [x, y, z];
        }
    }
}

export class ParametricSurfaceKleinBottle extends ParametricSurfaceBaseClass {
    constructor(r1 = 2, r2 = 0.3) {
        super();
        this.R = r1; // Radius of the tube of the Klein bottle
        this.r = r2; // Radius of the cross-section of the tube
    }

    get_raw_parametric_function() {
        return (u, v) => {
            u *= Math.PI * 2; // u ranges from 0 to 2π
            v *= Math.PI * 2; // v ranges from 0 to 2π

            const x = (this.R + this.r * Math.cos(u / 2) * Math.sin(v) - this.r * Math.sin(u / 2) * Math.sin(2 * v)) * Math.cos(u);
            const y = (this.R + this.r * Math.cos(u / 2) * Math.sin(v) - this.r * Math.sin(u / 2) * Math.sin(2 * v)) * Math.sin(u);
            const z = this.r * Math.sin(u / 2) * Math.sin(v) + this.r * Math.cos(u / 2) * Math.sin(2 * v);

            return [x, y, z];
        }
    }
}

