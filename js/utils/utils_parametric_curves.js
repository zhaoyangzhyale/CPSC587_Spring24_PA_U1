import {convert_z_up_array_to_y_up_array, get_default_lil_gui, spawn_static_parametric_curve} from "./utils_three.js";
import {
    add_matrix_matrix,
    cross_product,
    mul_matrix_scalar,
    normalized_matrix,
    sub_matrix_matrix,
    unroll_matrix_to_list
} from "./utils_math.js";

export class ParametricCurveBaseClass {
    constructor() {
        if (new.target === ParametricCurveBaseClass) {
            throw new Error("ParametricCurveBaseClass is a template class and cannot be instantiated directly.");
        }

        this.raw_parametric_function = this.get_raw_parametric_function();
    }

    // returns a function that takes in one parameter (u) that will vary on the range 0-1 and returns a
    // point in space [x, y, z].
    get_raw_parametric_function() {
        throw new Error("Method 'get_raw_parametric_function()' must be implemented in the derived class.");
    }

    get_raw_parametric_function_z_up() {
        return (u) => {
            return convert_z_up_array_to_y_up_array(this.raw_parametric_function(u));
        }
    }

    get_surface_spanning_vector_at_point(u) {
        let uu = u + 0.0001;

        let point = this.raw_parametric_function(u);
        let uu_point = this.raw_parametric_function(uu);

        return normalized_matrix(sub_matrix_matrix(uu_point, point));
    }

    spawn_in_three(scene, num_points=100, render_through_other_objects=false, width=0.01, start_color=0x000000, end_color= 0x000000, opacity=1.0) {
        spawn_static_parametric_curve(scene, this.raw_parametric_function, num_points, render_through_other_objects, width, start_color, end_color, opacity);
    }
}

export class ParametricCurveThreeVisualizer {
    constructor(parametric_curve) {
        this.parametric_curve = parametric_curve;
        this.settings = {
            u: 0.5,
            draw_tangent_space: false,
            tangent_space_vector_length: 0.25
        };
        let gui = get_default_lil_gui();
        gui.add(this.settings, 'u', 0, 1).name('u');
        gui.add(this.settings, 'draw_tangent_space').name('Draw Tangent Space');
        gui.add(this.settings, 'tangent_space_vector_length', 0.1, 1.0).name('Tangent Vec. Size');
        this.gui = gui;
    }

    three_loop_function(three_engine) {
        let point = this.parametric_curve.raw_parametric_function(this.settings.u);
        three_engine.draw_debug_sphere(point, 0.04, 0x00eeff);

        if (this.settings.draw_tangent_space) {
            let ss = this.parametric_curve.get_surface_spanning_vector_at_point(this.settings.u);
            three_engine.draw_debug_vector(point, add_matrix_matrix(point, mul_matrix_scalar(ss, this.settings.tangent_space_vector_length)), 0.02, undefined, 0x777788);
        }
    }
}

export class ParametricCurveLineTest extends ParametricCurveBaseClass {
    constructor() {
        super();
    }

    get_raw_parametric_function() {
        return u => {
            let start_point = [1,-2,-2.5];
            let end_point = [-1,2,2.5];

            let a = mul_matrix_scalar(start_point, 1-u);
            let b = mul_matrix_scalar(end_point, u);

            let c = add_matrix_matrix(a, b);
            return unroll_matrix_to_list(c);
        }
    }
}

export class ParametricCurveUnitCircle extends ParametricCurveBaseClass {
    constructor() {
        super();
    }

    get_raw_parametric_function() {
        return u => {
            u *= Math.PI * 2;
            return [Math.cos(u), Math.sin(u), 0];
        }
    }
}