////////////////////////////////////////////////////////////////////////////////
// GLOBAL VARS
////////////////////////////////////////////////////////////////////////////////

var EPS = 0.0001,
    PI = 3.141592654,
    HALF_PI = 1.570796327;

var WIDTH = 400,
    HEIGHT = 400;

var $container;
var gCamera, gScene, gRenderer;
var gCamera2, gScene2, gControls;
var gKeyboard; // keyboard state

var lambert1 = new THREE.MeshLambertMaterial({color: 0xCC0000});

// scene globals to be passed as uniforms
var gPhotonNum = 100;
var gPhotons = [];

var gRoomDim;
var gLightP;
var gLightI = 1.0;

var gShapeNum = 3;
var gShapeP = [];   // vec3
var gShapeR = [];   // floats
var gShapeC = [];   // vec3

// ray tracing globals
var gT, gPos, gN, gCol;

function println(msg) {
  $("#gl-log").append("<p>"+msg+"</p>");
}
function stringVector3(v) {
  return "("+v.x+" "+v.y+" "+v.z+")";
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

////////////////////////////////////////////////////////////////////////////////
// INTERSECTION
////////////////////////////////////////////////////////////////////////////////

// out t
function intersectShape(i, P, V) {
  var dist = P.clone().subSelf(gShapeP[i]);
  
  if (true) {
    var A = V.dot(V);
    var B = 2.0 * dist.dot(V);    
    var C = dist.dot(dist) - gShapeR[i]*gShapeR[i];
    
    var d = B*B - 4.0*A*C;  // discriminant
    if (d < 0.0) return false;
    
    d = Math.sqrt(d);
    gT = (-B-d)/(2.0*A);
    if (gT > 0.0) {
      return true;
    }
    
    gT = (-B+d)/(2.0*A);
    if (gT > 0.0) {
      return true;
    }
    
    return false;
  }
  else {
    // cube case, not implemented
    return false;
  }
}

function getShapeNormal(i, hit) {
	if (true) {
		return hit.clone().subSelf(gShapeP[i]).divideSelf(gShapeR[i]);
	}
	else {
		return null; // not implemented
	}
}

// out pos, normal, color
function intersectRoom(P, V) {
  
  var tNear = -Number.MAX_VALUE;
  var tFar = Number.MAX_VALUE;
  var i;
  {
    var t1, t2;
    
    t1 = (-gRoomDim.x-P.x)/V.x;
    t2 = (gRoomDim.x-P.x)/V.x;
    if (t1>t2) {
      var temp = t1;
      t1 = t2;
      t2 = temp;
    }    
    if(t1>tNear) tNear = t1;
    if(t2<tFar) tFar = t2;
    
    t1 = (-gRoomDim.y-P.y)/V.y;
    t2 = ( gRoomDim.y-P.y)/V.y;
    if (t1>t2) {
      var temp = t1;
      t1 = t2;
      t2 = temp;
    }    
    if(t1>tNear) tNear = t1;
    if(t2<tFar) tFar = t2;
    
    t1 = (-gRoomDim.z-P.z)/V.z;
    t2 = ( gRoomDim.z-P.z)/V.z;
    if (t1>t2) {
      var temp = t1;
      t1 = t2;
      t2 = temp;
    }    
    if(t1>tNear) tNear = t1;
    if(t2<tFar) tFar = t2;
  }
  
  if (tNear<tFar && tFar>0.0) {
    // take tFar, want back of box
    
    gPos = P.clone().addSelf(V.clone().multiplyScalar(tFar));
    
		if (gPos.x < -gRoomDim.x+EPS) {
      gN = new THREE.Vector3( 1.0, 0.0, 0.0);
      gCol = new THREE.Vector3(1.0, 1.0, 0.0);
    }
		else if (gPos.x >  gRoomDim.x-EPS) {
      gN = new THREE.Vector3(-1.0, 0.0, 0.0);
      gCol = new THREE.Vector3(0.0, 0.0, 1.0);
    }
		else if (gPos.y < -gRoomDim.y+EPS) {
      gN = new THREE.Vector3(0.0, 1.0, 0.0);
      if (gPos.x/5.0-Math.floor(gPos.x/5) > 0.5 ==
          gPos.z/5.0-Math.floor(gPos.z/5) > 0.5) {
        gCol = new THREE.Vector3(0.5);
      }
      else {
        gCol = new THREE.Vector3(0.0);
      }
    }
		else if (gPos.y >  gRoomDim.y-EPS) {
      gN = new THREE.Vector3(0.0, -1.0, 0.0);
      gCol = new THREE.Vector3(0.5);
    }
		else if (gPos.z < -gRoomDim.z+EPS) {
      gN = new THREE.Vector3(0.0, 0.0,  1.0);
      gCol = new THREE.Vector3(0.5);
    }
		else {
      gN = new THREE.Vector3(0.0, 0.0, -1.0);
      gCol = new THREE.Vector3(0.5);
    }
    
    return true;
  }
  
  return false;
}

function intersectWorld(P, V) {  
  var t_min = Number.MAX_VALUE;
  gT = 0;
  
  var i;
  for (i=0; i<gShapeNum; i++) {
    if (intersectShape(i,P,V) && gT<t_min) {
      t_min=gT;
      
      gPos = P.clone().addSelf(V.clone().multiplyScalar(t_min));
      gN = getShapeNormal(i, gPos);
      gCol = gShapeC[i];
      
			return true;
    }
  }
  
  return intersectRoom(P,V);
}

////////////////////////////////////////////////////////////////////////////////
// PHOTON MAPPING
////////////////////////////////////////////////////////////////////////////////

function uniformRandomDirection() {
	var u = Math.random();
	var v = Math.random();
	var z = 1.0 - 2.0 * u;
	var r = Math.sqrt(1.0 - z * z);
	var angle = 6.283185307179586 * v;
	return new THREE.Vector3(r * Math.cos(angle), r * Math.sin(angle), z);
}

function uniformRandomDirectionNY() {
	var u = Math.random();
	var v = Math.random();
	var y = -1.0 * u;
	var r = Math.sqrt(1.0 - y * y);
	var angle = 6.283185307179586 * v;
	return new THREE.Vector3(r * Math.cos(angle), y, r * Math.sin(angle));
}

function scatterPhotons() {  
  var dot = new THREE.SphereGeometry(.2, 1, 1);
  
  for (i=0; i<gPhotonNum; i++) {
    var P = gLightP;
    var V = new uniformRandomDirectionNY();
    
    if (intersectWorld(P,V)) {
      gPhotons.push(gPos.x, gPos.y, gPos.z);
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
// INITIALIZATION
////////////////////////////////////////////////////////////////////////////////

function initScene() {
  gRoomDim = new THREE.Vector3(5.0, 5.0, 5.0);
  gLightP = new THREE.Vector3(0.0, 4.9, 0.0);
  
  gShapeP.push(new THREE.Vector3(0.0, 0.0, 0.0));
  gShapeR.push(1.2);
  gShapeC.push(new THREE.Vector3(0.0, 0.0, 0.9));
  
  gShapeP.push(new THREE.Vector3(2.5, -1.0, 1.5));
  gShapeR.push(1.0);
  gShapeC.push(new THREE.Vector3(0.9, 0.0, 0.0));
  
  gShapeP.push(new THREE.Vector3(-1.5, 0.5, 2.0));
  gShapeR.push(0.8);
  gShapeC.push(new THREE.Vector3(0.0, 0.9, 0.0));
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
  gCamera  = new THREE.OrthographicCamera(-.5, .5, .5, -.5, -1, 1);
  
  // scene for rendering
  gScene = new THREE.Scene();
  
  // camera for raytracing
  gCamera2 = new THREE.PerspectiveCamera(
    30,
    WIDTH / HEIGHT,
    1,
    1e3 );
  gCamera2.position.z = 10;
  
  gControls = new THREE.TrackballControls(gCamera2);
  gControls.rotateSpeed = 1.0;
  gControls.zoomSpeed = 1.2;
  gControls.panSpeed = 1.0;    
  gControls.dynamicDampingFactor = 0.3;
  gControls.staticMoving = false;
  gControls.noZoom = false;
  gControls.noPan = false;
    
  // scene for raytracing
  
  gScene2.add(gCamera2);
  
  var uniforms = {
    WIDTH:      {type: "i", value: WIDTH},
    HEIGHT:     {type: "i", value: HEIGHT},
    
    uCamPos:    {type: "v3", value: gCamera2.position},
    uCamCenter: {type: "v3", value: gControls.target},
    uCamUp:     {type: "v3", value: gCamera2.up},
    
    uRoomDim:   {type: "v3", value: gRoomDim},
    uLightP:    {type: "v3", value: gLightP},
    uLightI:    {type: "f", value: gLightI},
    
    uShapeP:    {type: "v3v", value: gShapeP},
    uShapeR:    {type: "fv1", value: gShapeR},
    uShapeC:    {type: "v3v", value: gShapeC},
    uPhotons:   {type: "fv", value: gPhotons}
  };
  
  var shader = new THREE.ShaderMaterial({
    uniforms:       uniforms,
    vertexShader:   $("#shader-vs").text(),
    fragmentShader: $("#shader-fs").text()
  });
  
  // setup plane in scene for rendering
  var shape;
  shape = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shader);
  gScene.add(shape);
}

/* UPDATE */
function update() {
  if( gKeyboard.pressed("shift+R") ) {
    gCamera2.position.set(0,0,10);
    gControls.target.set(0,0,0);
    gCamera2.up.set(0,1,0);
  }
  
  gControls.update();
  gRenderer.render(gScene, gCamera);
  RequestAnimFrame(update);
}

function init() {
  gScene2 = new THREE.Scene();
  
  initScene();
  scatterPhotons();
  initTHREE();
  RequestAnimFrame(update);
}

/* DOC READY */
$(document).ready(function() {
  
  // load shader strings
  $("#shader-fs").load("shader/render.fs", init);
  
  p = new THREE.Vector3(0, 0, 0);
  v = new THREE.Vector3(.77, -.5, .4);
});

//function initScene() {
//  var light;
//  light = new THREE.PointLight( 0xFFFFFF );
//  light.position.set(.1,5,.1);
//  gScene2.add(light);
//  light = new THREE.AmbientLight( 0x222222 );
//  gScene2.add(light);
//  
//  var sphere = new THREE.SphereGeometry(1, 16, 16);
//  var cube = new THREE.CubeGeometry(2,2,2);
//  var plane = new THREE.PlaneGeometry(1,1);
//  
//  var shape;
//  
//  shape = new THREE.Mesh(sphere, lambert1);
//  shape.scale.set(1.2, 1.2, 1.2);
//  gScene2.add(shape);
//  
//  shape = new THREE.Mesh(cube, lambert1);
//  shape.position.set(2.5, -1.0, 1.5);
//  gScene2.add(shape);
//  
//  shape = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), lambert1);
//  shape.position.set(-1.5, 0.5, 2.0);
//  gScene2.add(shape);
//  
//  // top
//  shape = new THREE.Mesh(plane, lambert1);
//  shape.position.set(0.0, 5.0, 0.0);
//  shape.rotation.set(HALF_PI, 0.0, 0.0);
//  shape.scale.set(10.0, 10.0, 10.0);
//  gScene2.add(shape);
//  
//  // bottom
//  shape = new THREE.Mesh(plane, lambert1);
//  shape.position.set(0.0, -5.0, 0.0);
//  shape.rotation.set(-HALF_PI, 0.0, 0.0);
//  shape.scale.set(10.0, 10.0, 10.0);
//  gScene2.add(shape);
//  
//  // left
//  shape = new THREE.Mesh(plane, lambert1);
//  shape.position.set(-5,0,0);
//  shape.rotation.set(0.0, HALF_PI, 0.0);
//  shape.scale.set(10.0, 10.0, 10.0);
//  gScene2.add(shape);
//  
//  // right
//  shape = new THREE.Mesh(plane, lambert1);
//  shape.position.set(5,0,0);
//  shape.rotation.set(0.0, -HALF_PI, 0.0);
//  shape.scale.set(10.0, 10.0, 10.0);
//  gScene2.add(shape);
//  
//  // back
//  shape = new THREE.Mesh(plane, lambert1);
//  shape.position.set(0.0, 0.0, -5.0);
//  shape.scale.set(10.0, 10.0, 10.0);
//  gScene2.add(shape);
//  
//  // front
//  shape = new THREE.Mesh(plane, lambert1);
//  shape.position.set(0,0,5);
//  shape.rotation.set(PI, 0.0, 0.0);
//  shape.scale.set(10.0, 10.0, 10.0);
//  gScene2.add(shape);
//}