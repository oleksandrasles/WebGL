'use strict';

let gl; // The webgl context.
let surface; // A surface model
let shProgram; // A shader program
let spaceball; // A SimpleRotator object that lets the user rotate the view by mouse.
let pModel, pModelT = [0.5, 0.5];

function deg2rad(angle) {
  return angle * Math.PI / 180;
}

// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.iTextureBuffer = gl.createBuffer();
  this.count = 0;

  this.BufferData0 = function (vertices) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    this.count = vertices.length / 3;
  };

  this.BufferData1 = function (textures) {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textures), gl.STREAM_DRAW);

}

  this.Draw = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.vertexAttribPointer(shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribTexture);

    gl.drawArrays(gl.TRIANGLES, 0, this.count);
  };

}

// Constructor
function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;

  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1;
  // Location of the uniform specifying a color for the primitive.
  this.iColor = -1;
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1;

  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw0() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /* Set the values of the projection transformation */
  let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

  /* Get the view matrix from the SimpleRotator object.*/
  let modelView = spaceball.getViewMatrix();

  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
  let translateToPointZero = m4.translation(0, 0, -10);

  let matAccum0 = m4.multiply(rotateToPointZero, modelView);
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

  /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
  let modelViewProjection = m4.multiply(projection, matAccum1);

  gl.uniformMatrix4fv(
    shProgram.iModelViewProjectionMatrix,
    false,
    modelViewProjection
  );

  /* Draw the six faces of a cube, with different colors. */
  let r = document.getElementById('r').value
  console.log(r)
  gl.uniform1f(shProgram.iR, r);
  gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);
  gl.uniform2fv(shProgram.iPT, pModelT);
  surface.Draw();
  gl.uniform4fv(shProgram.iColor, [1, 1, 0, -1]);
  gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, m4.multiply(
      modelViewProjection,
      m4.translation(...getVertex(pModelT[0], mapRange(pModelT[1], 0, 1, -5, 5)))
  ));
  pModel.Draw();

}

function draw1(){
  draw0()
  window.requestAnimationFrame(draw1)
}

function CreateSurfaceData(stepU = 0.008, stepV = 0.01) {
  let vertexList = [];
  let normalList = [];
  let textureList = [];
  const calcNormal = (u, v) => {
    let d = 0.0001
    let uv = getVertex(u, v)
    let u1 = getVertex(u + d, v)
    let v1 = getVertex(u, v + d)
    let dU = [], dV = []
    for (let i = 0; i < 3; i++){
      dU.push((uv[i] - u1[i]) / d)
      dV.push((uv[i] - v1[i]) / d)
    }
    let n = m4.cross(dU, dV)
    return m4.normalize(n)
  }
  for (let u = 0; u < 1; u += stepU) {
    for (let v = -5; v < 5; v += stepV) {
      let v1 = getVertex(u, v)
      let v2 = getVertex(u + stepU, v)
      let v3 = getVertex(u, v + stepV)
      let v4 = getVertex(u + stepU, v + stepV)
      let n1 = calcNormal(u, v)
      let n2 = calcNormal(u + stepU, v)
      let n3 = calcNormal(u, v + stepV)
      let n4 = calcNormal(u + stepU, v + stepV)
      vertexList.push(
        ...v1, ...v2, ...v3,
        ...v3, ...v2, ...v4
      );
      normalList.push(
        ...n1, ...n2, ...n3,
        ...n3, ...n2, ...n4
      );
      textureList.push(
        u, mapRange(v, -5, 5, 0, 1), u + stepU, mapRange(v, -5, 5, 0, 1), u, mapRange(v + stepV, -5, 5, 0, 1),
        u, mapRange(v + stepV, -5, 5, 0, 1), u + stepU, mapRange(v, -5, 5, 0, 1), u + stepU, mapRange(v + stepV, -5, 5, 0, 1),
    )
    }
  }
  return [vertexList, normalList, textureList];
}

function mapRange(value, a, b, c, d) {
  value = (value - a) / (b - a);

  return c + value * (d - c);
}

function getVertex(u, v, m = 0.3, H = 1, c = 5, alpha = 0.033 * Math.PI, p = 8 * Math.PI, phi = 0, theta0 = 0) {
  let theta = p * u + theta0;
  let x = c * u + v * (Math.sin(phi) + Math.tan(alpha) * Math.cos(phi) * Math.cos(theta));
  let y = v * Math.tan(alpha) * Math.sin(theta);
  let z = H + v * (Math.tan(alpha) * Math.sin(phi) * Math.cos(theta) - Math.cos(phi));
  return [m * x, m * y, m * z]
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram('Basic', prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, 'vertex');
  shProgram.iAttribTexture = gl.getAttribLocation(prog, "texture");
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(
    prog,
    'ModelViewProjectionMatrix'
  );
  shProgram.iColor = gl.getUniformLocation(prog, 'color');
  shProgram.iR = gl.getUniformLocation(prog, "r");
  shProgram.iPT = gl.getUniformLocation(prog, "pModelT");

  surface = new Model('Surface');
  let data = CreateSurfaceData()
  surface.BufferData0(data[0]);
  surface.BufferData1(data[2]);
  pModel = new Model('pModel')
  let pData = CreateSphereData()
  pModel.BufferData0(pData);
  pModel.BufferData1(pData);

  gl.enable(gl.DEPTH_TEST);
}

function CreateSphereData() {
  let vertexList = [];

  let u = 0,
      t = 0;
  while (u < Math.PI * 2) {
      while (t < Math.PI) {
          let v = getSphereVertex(u, t);
          let w = getSphereVertex(u + 0.1, t);
          let wv = getSphereVertex(u, t + 0.1);
          let ww = getSphereVertex(u + 0.1, t + 0.1);
          vertexList.push(v.x, v.y, v.z);
          vertexList.push(w.x, w.y, w.z);
          vertexList.push(wv.x, wv.y, wv.z);
          vertexList.push(wv.x, wv.y, wv.z);
          vertexList.push(w.x, w.y, w.z);
          vertexList.push(ww.x, ww.y, ww.z);
          t += 0.1;
      }
      t = 0;
      u += 0.1;
  }
  return vertexList
}
const radius = 0.05;
function getSphereVertex(long, lat) {
  return {
      x: radius * Math.cos(long) * Math.sin(lat),
      y: radius * Math.sin(long) * Math.sin(lat),
      z: radius * Math.cos(lat)
  }
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error('Error in vertex shader:  ' + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error('Error in fragment shader:  ' + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('Link error in program:  ' + gl.getProgramInfoLog(prog));
  }
  return prog;
}

/**
 * initialization function that will be called when the page has loaded
 */
function init() {
  window.onkeydown = (e) => {
    if (e.keyCode == 87) {
        pModelT[0] = Math.min(pModelT[0] + 0.01, 1);
    }
    else if (e.keyCode == 83) {
        pModelT[0] = Math.max(pModelT[0] - 0.01, 0);
    }
    else if (e.keyCode == 68) {
        pModelT[1] = Math.min(pModelT[1] + 0.01, 1);
    }
    else if (e.keyCode == 65) {
        pModelT[1] = Math.max(pModelT[1] - 0.01, 0);
    }
  }
  let canvas;
  try {
    canvas = document.getElementById('webglcanvas');
    gl = canvas.getContext('webgl');
    if (!gl) {
      throw 'Browser does not support WebGL';
    }
  } catch (e) {
    document.getElementById('canvas-holder').innerHTML =
      '<p>Sorry, could not get a WebGL graphics context.</p>';
    return;
  }
  try {
    initGL(); // initialize the WebGL graphics context
  } catch (e) {
    document.getElementById('canvas-holder').innerHTML =
      '<p>Sorry, could not initialize the WebGL graphics context: ' +
      e +
      '</p>';
    return;
  }

  spaceball = new TrackballRotator(canvas, draw0, 0);
  LoadTexture()
  draw1();
}

function LoadTexture() {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const image = new Image();
  image.crossOrigin = 'anonymus';
  image.src = " ";
  image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      console.log("texture loaded")
  }
}