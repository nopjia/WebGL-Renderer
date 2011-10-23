////////////////////////////////////////////////////////////////////////////////
// GLOBAL VARS
////////////////////////////////////////////////////////////////////////////////

var PI = 3.141592654,
    HALF_PI = 1.570796327;

var WIDTH = 400,
    HEIGHT = 400;

var $container;
var gCamera, gScene, gRenderer;
var gCamera2, gScene2;
var gKeyboard; // keyboard state


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
  if( gKeyboard.pressed("shift+R") ) {
    gCamera2.position.set(0,0,10);
    gCamera2.target.position.set(0);
    gCamera2.up.set(0,1,0);
  }
  
  gCamera2.update();
  gRenderer.render(gScene2, gCamera2);
  RequestAnimFrame(update);
}

function initScene() {
  var light;
  light = new THREE.PointLight( 0xFFFFFF );
  light.position.set(0,5,0);
  gScene2.addLight(light);
  light = new THREE.AmbientLight( 0x222222 );
  gScene2.addLight(light);
  
  var lambert1 = new THREE.MeshLambertMaterial(
  {
    color: 0xCCCCCC
  });
  
  var shape, node;
  
  shape = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), lambert1);
  node = new THREE.Object3D();
  node.addChild(shape);
  gScene2.addChild(node);
  
  shape = new THREE.Mesh(new THREE.CubeGeometry(2, 2, 2), lambert1);
  node = new THREE.Object3D();
  node.position.set(2.5, -1.0, 1.5);
  node.addChild(shape);
  gScene2.addChild(node);
  
  shape = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), lambert1);
  node = new THREE.Object3D();
  node.position.set(-1.5, 0.5, 2.0);
  node.addChild(shape);
  gScene2.addChild(node);
  
  // top
  shape = new THREE.Mesh(new THREE.PlaneGeometry(1,1), lambert1);
  node = new THREE.Object3D();
  node.position.set(0,5,0);
  node.rotation.set(HALF_PI,0,0);
  node.scale.set(10,10,10);
  node.addChild(shape);
  gScene2.addChild(node);
  
  // bottom
  shape = new THREE.Mesh(new THREE.PlaneGeometry(1,1), lambert1);
  node = new THREE.Object3D();
  node.position.set(0,-5,0);
  node.rotation.set(-HALF_PI,0,0);
  node.scale.set(10,10,10);
  node.addChild(shape);
  gScene2.addChild(node);
  
  // left
  shape = new THREE.Mesh(new THREE.PlaneGeometry(1,1), lambert1);
  node = new THREE.Object3D();
  node.position.set(-5,0,0);
  node.rotation.set(0,HALF_PI,0);
  node.scale.set(10,10,10);
  node.addChild(shape);
  gScene2.addChild(node);
  
  // right
  shape = new THREE.Mesh(new THREE.PlaneGeometry(1,1), lambert1);
  node = new THREE.Object3D();
  node.position.set(5,0,0);
  node.rotation.set(0,-HALF_PI,0);
  node.scale.set(10,10,10);
  node.addChild(shape);
  gScene2.addChild(node);
  
  // back
  shape = new THREE.Mesh(new THREE.PlaneGeometry(1,1), lambert1);
  node = new THREE.Object3D();
  node.position.set(0,0,-5);
  node.scale.set(10,10,10);
  node.addChild(shape);
  gScene2.addChild(node);
  
  // front
  shape = new THREE.Mesh(new THREE.PlaneGeometry(1,1), lambert1);
  node = new THREE.Object3D();
  node.position.set(0,0,5);
  node.rotation.set(PI,0,0);
  node.scale.set(10,10,10);
  node.addChild(shape);
  gScene2.addChild(node);
}

/* INIT GL */
function initTHREE() {
  $container = $('#webgl-container')
  
  $container.mousedown(mouseDown);
  $container.mouseup(mouseUp);
  $container.mousemove(mouseMove);
  
  gKeyboard = new THREEx.KeyboardState();
  
  // setup WebGL renderer
  gRenderer = new THREE.WebGLRenderer();
  gRenderer.setSize(WIDTH, HEIGHT);
  $container.append(gRenderer.domElement);
  
  // camera to render, orthogonal (fov=0)
  gCamera  = new THREE.Camera(0, WIDTH/HEIGHT, 1, 1e3);
  gCamera.position.z = 1;
  
  // scene for rendering
  gScene = new THREE.Scene();
  
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
  
  // scene for raytracing
  gScene2 = new THREE.Scene();
  
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
  
  // setup plane in scene for rendering
  var shape;
  shape = new THREE.Mesh(
     new THREE.PlaneGeometry(1, 1),
     shader);
  gScene.addChild(shape);
  
  // setup "real" scene
  initScene();
}

/* DOC READY */
$(document).ready(function() {
  
  var init = function() {
    initTHREE();
    RequestAnimFrame(update);
  }
  
  // load shader strings
  $("#fragmentshader").load("shader/render.fs", init);  
});