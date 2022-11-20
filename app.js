"use strict";

let gl;
let program;

let vBuffer;
let cBuffer;
let points;
let canvas;

var xMin = 0;
var zMin = 0;
var xMax;
var zMax;

let Escape = false;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

let eye = vec3(1200, 1200, 300.0);
let at_vec = vec3(0.0, 0.0, 300.0);
let at = add(eye, at_vec);
let up = vec3(0.0, 1.0, 0.0);

let left_ = -0.1;
let right_ = 0.1;
let bottom_ = -0.5;
let top_ = 1.5;
let near_ = 0.1;
let far_ = -0.1;

let pitch = 0;
let yaw = 0;
let roll = 0;

let speed = 0.1;
let stopped = false;

var anim;

window.onload = () => {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) alert("WebGL 2.0 isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.55686, 0.70196, 0.81961, 1.0);
    gl.enable(gl.DEPTH_TEST);

    xMax = canvas.width;
    zMax = canvas.height;

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    points = getPatch(0, 600, 0, 600);

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    let positionLoc = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    window.cancelAnimationFrame(anim);

    if (Escape) window.cancelAnimationFrame(anim);
    else window.requestAnimationFrame(render);
};

const render = () => {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    points = getPatch(xMin, xMax, zMin, zMax);

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);

    if (Escape == false) {
        gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    }

    let rotate_x_matrix = rotateX(pitch);
    let rotate_y_matrix = rotateY(yaw);
    let rotate_z_matrix = rotateZ(roll);

    up = vec4(0, 1, 0, 0);
    up = mult(rotate_z_matrix, up);
    up = vec3(up[0], up[1], up[2]);

    at_vec = vec3(0.0, 0.0, speed);
    at_vec = vec4(at_vec[0], at_vec[1], at_vec[2], 0);
    let rotate_xy = mult(rotate_y_matrix, rotate_x_matrix);
    at_vec = mult(rotate_xy, at_vec);

    at_vec = vec3(at_vec[0], at_vec[1], at_vec[2]);

    if (!stopped) move_camera_pitch();

    at = add(eye, at_vec);
    modelViewMatrix = lookAt(eye, at, up);

    if (!stopped) eye = add(eye, at_vec);

    xMin = eye[0] - 1200;
    xMax = eye[0] + 1200;

    zMin = eye[2] - 1200;
    zMax = eye[2] + 1200;

    projectionMatrix = frustum(left_, right_, bottom_, top_, near_, far_);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, points.length);

    anim = window.requestAnimationFrame(render);
};

const getPatch = (xmin, xmax, zmin, zmax) => {
    let ret = []; // triangle vertices
    var xzMin = vec2(xmin, zmin);
    var xzMax = vec2(xmax, zmax);
    var xDivs = 100;
    var zDivs = 100;
    var dim = subtract(xzMax, xzMin);
    var dx = dim[0] / xDivs;
    var dz = dim[1] / zDivs;
    let xoff = xmin / 10; // for perlin noise
    for (var x = xzMin[0]; x < xzMax[0]; x += dx) {
        let zoff = zmin / 10; // for perlin noise
        for (var z = xzMin[1]; z < xzMax[1]; z += dz) {
            ret.push(vec4(x, getHeight(xoff, zoff), z, 1));
            ret.push(vec4(x, getHeight(xoff, zoff + 0.1), z + dz, 1));
            ret.push(
                vec4(x + dx, getHeight(xoff + 0.1, zoff + 0.1), z + dz, 1)
            );

            ret.push(vec4(x, getHeight(xoff, zoff), z, 1));
            ret.push(
                vec4(x + dx, getHeight(xoff + 0.1, zoff + 0.1), z + dz, 1)
            );
            ret.push(vec4(x + dx, getHeight(xoff + 0.1, zoff), z, 1));
            zoff += 0.1;
        }
        xoff += 0.1;
    }
    return ret;
};

const getHeight = (x, z) => noise.perlin2(-x / 1.5, -z / 1.5) * 1400; // perlin noise

// frustum function by WS
const frustum = (l, r, b, t, n, f) => {
    if (l == r) throw "frustum(): left and right are equal";
    if (b == t) throw "frustum(): bottom and top are equal";
    if (n == f) throw "frustum(): near and far are equal";

    const w = r - l,
        h = t - b,
        d = f - n;

    let result = mat4(
        (2.0 * n) / w,
        0.0,
        (r + l) / w,
        0.0,
        0.0,
        (2.0 * n) / h,
        (t + b) / h,
        0.0,
        0.0,
        0.0,
        -(f + n) / d,
        (-2.0 * f * n) / d,
        0.0,
        0.0,
        -1,
        0.0
    );

    return result;
};

// Changes the Y coordinate of the camera accordingly
const move_camera_pitch = () =>
    (eye[1] = Math.min(Math.max(eye[1] + at_vec[1] * 50, 1000), 2000));
