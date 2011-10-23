////////////////////////////////////////////////////////////////////////////////
// GLOBALS
////////////////////////////////////////////////////////////////////////////////

var gl, shaderProgram, canvas;
var gCamera;

var uCamPos, uCamUp, uCamCenter;
var uTexture;

function println(msg) {
  $("#gl-log").append("<p>"+msg+"</p>");
}

////////////////////////////////////////////////////////////////////////////////
// MOUSE CALLBACK
////////////////////////////////////////////////////////////////////////////////

var gLastMouseX = 0,
    gLastMouseY = 0,
    gMouseDown  = false;
    
function mouseDown(event) {
  gMouseDown = true;
  gLastMouseX = event.clientX;
  gLastMouseY = event.clientY;
}
function mouseUp(event) {
  gMouseDown = false;
}
function mouseMove(event) {  
  if(gMouseDown) {
    $("#cam_pos").html("<b>cam_position:</b> "+gCamera.position.x+", "+gCamera.position.y+", "+gCamera.position.z);
    $("#cam_up").html("<b>cam_up:</b> "+gCamera.up.x+", "+gCamera.up.y+", "+gCamera.up.z);
  }
}

////////////////////////////////////////////////////////////////////////////////
// INIT THREE.js
////////////////////////////////////////////////////////////////////////////////

function initTHREE() {
  gKeyboard = new THREEx.KeyboardState();
  
  // camera for raytracing
  gCamera = new THREE.TrackballCamera({
    fov: 30, 
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 1e3,

    rotateSpeed: 1.0,
    zoomSpeed: 1.2,
    panSpeed: 1.0,
    
    dynamicDampingFactor: 0.3,
    staticMoving: false,

    noZoom: false,
    noPan: false
  });
  gCamera.position.z = 10;
}

////////////////////////////////////////////////////////////////////////////////
// INIT WEBGL
////////////////////////////////////////////////////////////////////////////////

function initGL() {  
  try {
    gl = canvas.getContext("experimental-webgl");
    gl.viewport(0, 0, canvas.width, canvas.height);
  } catch(e) {}  
  if (!gl) {
    println("Could not initialise WebGL.");
    return;
  }
  
  initShaders()
  initBuffers();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0); 
  
  drawScene();
}

function getShader(gl, id) {
  var shaderScript = document.getElementById(id);
  if (!shaderScript)
    return null;

  var shader;
  if (shaderScript.type == "x-shader/x-fragment")
  {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  }
  else if (shaderScript.type == "x-shader/x-vertex")
  {
    shader = gl.createShader(gl.VERTEX_SHADER);
  }
  else
  {
    return null;
  }

  gl.shaderSource(shader, shaderScript.textContent);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
  {    
    println(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

function initShaders() {
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
  {
    println("Could not initialise shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.aVertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.aVertexPosition);

  uCamPos = gl.getUniformLocation(shaderProgram, "uCamPos");
  uCamUp = gl.getUniformLocation(shaderProgram, "uCamUp");
  uCamCenter = gl.getUniformLocation(shaderProgram, "uCamCenter");
  uTexture = gl.getUniformLocation(shaderProgram, "uTexture");
}

function initBuffers() {
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  var vertices = [
       1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
      -1.0, -1.0,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.vertexAttribPointer(shaderProgram.aVertexPosition, 2, gl.FLOAT, false, 0, 0);
}

function createTexture() {
  var pix = [];

  for(var i=0;i<32;i++) {
    for(var j=0;j<32;j++)
      pix.push(0.8,0.1,1.0);
  }
  
  gl.activeTexture(gl.TEXTURE0);
  
  gl.bindTexture(gl.TEXTURE_2D, gl.TEXTURE0);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 32,32,0, gl.RGB, gl.FLOAT, new Float32Array(pix));
  
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.uniform1i(uTexture,0);
}

////////////////////////////////////////////////////////////////////////////////
// UPDATES
////////////////////////////////////////////////////////////////////////////////

function updateUniforms() {
  gl.uniform3f(uCamPos, gCamera.position.x, gCamera.position.y, gCamera.position.z);
  gl.uniform3f(uCamCenter, gCamera.target.position.x, gCamera.target.position.y, gCamera.target.position.z);
  gl.uniform3f(uCamUp, gCamera.up.x, gCamera.up.y, gCamera.up.z);  
}

function drawScene() {
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

/* UPDATE */
function update() {
  if( gKeyboard.pressed("shift+R") ) {
    gCamera.position.set(0.0,0.0,10.0);
    gCamera.target.position.set(0.0,0.0,0.0);
    gCamera.up.set(0.0,1.0,0.0);
  }
  
  gCamera.update();
  
  updateUniforms();
  drawScene();
  
  RequestAnimFrame(update);
}

/* DOC READY */
$(document).ready(function() {
  
  $container = $('#webgl-canvas')
  
  $container.mousedown(mouseDown);
  $container.mouseup(mouseUp);
  $container.mousemove(mouseMove);
  
  canvas = document.getElementById("webgl-canvas");
  
  var init = function() {
    initTHREE();
    initGL();
    RequestAnimFrame(update);
  }
  
  // load shader strings
  $("#shader-fs").load("shader/render2.fs", init);
  
});