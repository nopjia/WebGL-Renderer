////////////////////////////////////////////////////////////////////////////////
// GLOBAL VARS
////////////////////////////////////////////////////////////////////////////////

var PI = 3.141592654,
    HALF_PI = 1.570796327;

var WIDTH = 400,
    HEIGHT = 400;

var $container;
var gCamera, gScene, gRenderer;
var gCamera2;


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
  /*
  if(gMouseDown) {
    var thisMouseX = event.clientX;
    var thisMouseY = event.clientY;
  
    gRoot.rotation.y += (thisMouseX - gLastMouseX) * 0.01;
    gRoot.rotation.x += (thisMouseY - gLastMouseY) * 0.01;
    
    gLastMouseY = thisMouseY;
    gLastMouseX = thisMouseX;
  }
  */
  
  if(gMouseDown) {
    $("#cam_pos").html("<b>cam_position:</b> "+gCamera2.position.x+", "+gCamera2.position.y+", "+gCamera2.position.z);
    $("#cam_up").html("<b>cam_up:</b> "+gCamera2.up.x+", "+gCamera2.up.y+", "+gCamera2.up.z);
  }
}

/* UPDATE */
function update() {
  gCamera2.update();
  gRenderer.render(gScene, gCamera);
  RequestAnimFrame(update);
}

/* INIT GL */
function initGL() {
  $container = $('#webgl-container')
  
  $container.mousedown(mouseDown);
  $container.mouseup(mouseUp);
  $container.mousemove(mouseMove);
  
  // setup WebGL renderer
  gRenderer = new THREE.WebGLRenderer();
  gRenderer.setSize(WIDTH, HEIGHT);
  $container.append(gRenderer.domElement);
  
  // camera to render, orthogonal (fov=0)
  gCamera  = new THREE.Camera(0, WIDTH/HEIGHT, 1, 1e3);
  gCamera.position.z = 1;
  
  // camera for raytracing
  gCamera2 = new THREE.TrackballCamera({
    fov: 30, 
    aspect: WIDTH / HEIGHT,
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
  gCamera2.position.z = 10;
  
  // setup scene, for rendering
  gScene = new THREE.Scene();
  
  var uniforms = {
    WIDTH:      {type: "i", value: WIDTH},
    HEIGHT:     {type: "i", value: HEIGHT},
    camPos:     {type: "v3", value: gCamera2.position},
    camCenter:  {type: "v3", value: gCamera2.target.position},
    camUp:      {type: "v3", value: gCamera2.up}
  }
  
  var shader = new THREE.MeshShaderMaterial({
    uniforms:       uniforms,
    vertexShader:   $("#vertexshader").text(),
    fragmentShader: $("#fragmentshader").text()
  });
  
  var lambert1 = new THREE.MeshLambertMaterial(
  {
    color: 0xCCCCCC
  });
  
  var shape, node;
  shape = new THREE.Mesh(
     new THREE.PlaneGeometry(1, 1),
     shader);
  node = new THREE.Object3D();
  node.addChild(shape);
  gScene.addChild(node);
}

/* DOC READY */
$(document).ready(function() {
  
  var init = function() {
    initGL();
    RequestAnimFrame(update);
  }
  
  // load shader strings
  $("#fragmentshader").load("shader/render.fs", init);  
});