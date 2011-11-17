////////////////////////////////////////////////////////////////////////////////
// GLOBAL VARS
////////////////////////////////////////////////////////////////////////////////

var EPS = 0.0001,
    PI = 3.141592654,
    HALF_PI = 1.570796327;

var WIDTH = 400,
    HEIGHT = 400;
    
var INIT_PHOTON_N = 20;

var container;
var gRenderer, gStats;
var gCamera, gScene, gCamera2, gScene2, gControls;
var gKeyboard; // keyboard state

var lambert1 = new THREE.MeshLambertMaterial({color: 0xCC0000});

var gRoomDim;
var gLightP;
var gLightI = 1.0;

// scene globals to be passed as uniforms
var gPhotonNum = 0;
var gPhotonP = [];
var gPhotonI = [];
var gPhotonC = [];

var gShapeNum = 0;
var gShapeNumTi = 0; 	// 2nd half hold cubes
var gShapeP = [];   // vec3
var gShapeR = [];   // floats
var gShapeC = [];   // vec3

// ray tracing globals
var gT, gPos, gN, gCol;

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
  if (i < gShapeNumTi) {
    // sphere case
    var dist = P.clone().subSelf(gShapeP[i]);
    
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
    // cube case    
    var bMin = gShapeP[i].clone().addScalar(-gShapeR[i]);
    var bMax = gShapeP[i].clone().addScalar(gShapeR[i]);
    
    var tNear = -Number.MAX_VALUE;
    var tFar = Number.MAX_VALUE;
    {
      var t1, t2;
      
      t1 = (bMin.x-P.x)/V.x;
      t2 = (bMax.x-P.x)/V.x;
      if (t1>t2) {
        var temp = t1;
        t1 = t2;
        t2 = temp;
      }
      if(t1>tNear) tNear = t1;
      if(t2<tFar) tFar = t2;
      
      t1 = (bMin.y-P.y)/V.y;
      t2 = (bMax.y-P.y)/V.y;
      if (t1>t2) {
        var temp = t1;
        t1 = t2;
        t2 = temp;
      }    
      if(t1>tNear) tNear = t1;
      if(t2<tFar) tFar = t2;
      
      t1 = (bMin.z-P.z)/V.z;
      t2 = (bMax.z-P.z)/V.z;
      if (t1>t2) {
        var temp = t1;
        t1 = t2;
        t2 = temp;
      }    
      if(t1>tNear) tNear = t1;
      if(t2<tFar) tFar = t2;
    }
    
    if (tNear<tFar && tFar>0.0) {
      gT = tNear>0 ? tNear : tFar;
      return true;
    }
    
    return false;
  }
}

function getShapeNormal(i, hit) {
	if (i < gShapeNumTi) {
		return hit.clone().subSelf(gShapeP[i]).divideScalar(gShapeR[i]);
	}
	else {
    var p = hit.clone().subSelf(gShapeP[i]);
    var r = gShapeR[i];
		if 			(p.x < -r+EPS) return new THREE.Vector3(-1.0, 0.0, 0.0);
		else if (p.x >  r-EPS) return new THREE.Vector3( 1.0, 0.0, 0.0);
		else if (p.y < -r+EPS) return new THREE.Vector3(0.0, -1.0, 0.0);
		else if (p.y >  r-EPS) return new THREE.Vector3(0.0,  1.0, 0.0);
		else if (p.z < -r+EPS) return new THREE.Vector3(0.0, 0.0, -1.0);
		else return new THREE.Vector3(0.0, 0.0, 1.0);
	}
}

// out pos, normal, color
function intersectRoom(P, V) {
  
  var tNear = -Number.MAX_VALUE;
  var tFar = Number.MAX_VALUE;
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
        gCol = new THREE.Vector3(0.5, 0.5, 0.5);
      }
      else {
        gCol = new THREE.Vector3();
      }
    }
		else if (gPos.y >  gRoomDim.y-EPS) {
      gN = new THREE.Vector3(0.0, -1.0, 0.0);
      gCol = new THREE.Vector3(0.5, 0.5, 0.5);
    }
		else if (gPos.z < -gRoomDim.z+EPS) {
      gN = new THREE.Vector3(0.0, 0.0,  1.0);
      gCol = new THREE.Vector3(0.5, 0.5, 0.5);
    }
		else {
      gN = new THREE.Vector3(0.0, 0.0, -1.0);
      gCol = new THREE.Vector3(0.5, 0.5, 0.5);
    }
    
    return true;
  }
  
  return false;
}

function intersectWorld(P, V) {
  var t_min = Number.MAX_VALUE;
  gT = 0;
  
  var i;
  for (var i=0; i<gShapeNum; i++) {
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

function scatterPhotons() {  
  var dot = new THREE.SphereGeometry(.2, 1, 1);
  
  for (var i=0; i<INIT_PHOTON_N; i++) {
    var P = gLightP;
    var V = new uniformRandomDirectionNY();
    
    var col = new THREE.Vector3(1,1,1);
    castPhoton(P, V, col, 0);
  }
}

function castPhoton(P, V, col, depth) {
	if (depth<3 && intersectWorld(P,V)) {
    gPhotonNum++;
    
		// store current photon
    gPhotonP.push(gPos.x, gPos.y, gPos.z);
    gPhotonI.push(V.x, V.y, V.z);
    gPhotonC.push(col.x, col.y, col.z);
    
    // russian roulette
    // col = incident photon color
    // gCol = diffuse refl coeffs
    var colTop = gCol.clone().multiplySelf(col);
    var prob = max3(colTop.x, colTop.y, colTop.z) / max3(col.x, col.y, col.z);
    
    if (Math.random() < prob) {    
    	V = reflectVector3(V, gN);
      col.multiplySelf(gCol).multiplyScalar(prob);
    	castPhoton(gPos.addSelf(V.clone().multiplyScalar(EPS)), V, col, depth+1);
    }
	}
}

////////////////////////////////////////////////////////////////////////////////
// INITIALIZATION
////////////////////////////////////////////////////////////////////////////////

function pushShape(pos, col, radius) {
  gShapeP.push(pos);
  gShapeC.push(col);
  gShapeR.push(radius);
  gShapeNum++;
}

function initScene() {
  gRoomDim = new THREE.Vector3(5.0, 5.0, 5.0);
  gLightP = new THREE.Vector3(0.0, 4.9, 0.0);
  
	// spheres
  
  pushShape(
    new THREE.Vector3(-1.0, 0.0, -1.5),
    new THREE.Vector3(0.9, 0.0, 0.0),
    1.8);  
  pushShape(
    new THREE.Vector3(-2.5, 1.0, 2.0),
    new THREE.Vector3(0.0, 0.9, 0.0),
    1.2);
	
	// cubes
  gShapeNumTi = gShapeNum;
  
	pushShape(
    new THREE.Vector3(2.5, -2.0, 1.5),
    new THREE.Vector3(0.9, 0.0, 0.9),
    1.5);
	pushShape(
	  new THREE.Vector3(2.5, 1.0, -2.0),
    new THREE.Vector3(0.0, 0.5, 0.0),
    1.0);
}

function addPhotons() {
  for (var i=0; i<gPhotonP.length; i+=3) {
    var col = new THREE.Color();
		col.setRGB(gPhotonC[i], gPhotonC[i+1], gPhotonC[i+2]);
    
    var material = new THREE.LineBasicMaterial( {
      color: col.getHex(),
      opacity: 1,
      linewidth: 2
    } );
      
    var v1 = new THREE.Vector3(gPhotonP[i], gPhotonP[i+1], gPhotonP[i+2]);
    var v2 = v1.clone().subSelf(new THREE.Vector3(gPhotonI[i], gPhotonI[i+1], gPhotonI[i+2]));
		var geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vertex(v1));
    geometry.vertices.push(new THREE.Vertex(v2));
    
    var line = new THREE.Line( geometry, material, THREE.LinePieces );
		gScene2.add( line );
  }
  
  //addParticleSystem();
}

function addParticleSystem() {
	var particles = new THREE.Geometry();
	var mat = new THREE.ParticleBasicMaterial({color:0xFFFFFF, size:.5});
	
	for (var i=0; i<gPhotonP.length; i+=3) {
		var particle = new THREE.Vertex(
			new THREE.Vector3(gPhotonP[i], gPhotonP[i+1], gPhotonP[i+2]));
		particles.vertices.push(particle);
	}
	
	var sys = new THREE.ParticleSystem(particles,mat);
	gScene2.add(sys);
}

function initShaderConsts() {
  var str =
    "/* SET CONSTANTS */\n" +
    "#define SHAPE_N " + gShapeNum + "\n" +
    "#define SHAPE_N_TI " + gShapeNumTi + "\n" +
    "#define PHOTON_N " + gPhotonNum + "\n" +
    "\n";
  console.log(str);
  
  $("#shader-fs").prepend(str)
}

/* INIT GL */
function initTHREE() {
  container = $('#webgl-container')
  
  container.mousedown(mouseDown);
  container.mouseup(mouseUp);
  container.mousemove(mouseMove);
  
  gKeyboard = new THREEx.KeyboardState();
  
  // setup WebGL renderer
  gRenderer = new THREE.WebGLRenderer();
  gRenderer.setSize(WIDTH, HEIGHT);
  container.append(gRenderer.domElement);
  
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
  gScene2 = new THREE.Scene();
  gScene2.add(gCamera2);
	addPhotons();
  
  var uniforms = {
    uCamPos:    {type: "v3", value: gCamera2.position},
    uCamCenter: {type: "v3", value: gControls.target},
    uCamUp:     {type: "v3", value: gCamera2.up},
    
    uShapeP:    {type: "v3v", value: gShapeP},
    uShapeR:    {type: "fv1", value: gShapeR},
    uShapeC:    {type: "v3v", value: gShapeC},
		
		uPhotonP:		{type: "fv", value: gPhotonP},
    uPhotonI:		{type: "fv", value: gPhotonI},
		uPhotonC:		{type: "fv", value: gPhotonC}
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
	
	// stats ui
	gStats = new Stats();
	gStats.domElement.style.position = 'absolute';
	gStats.domElement.style.top = '0px';
	$("body").append( gStats.domElement );
}

/* UPDATE */
function update() {
  if( gKeyboard.pressed("shift+R") ) {
    gCamera2.position.set(0,0,10);
    gControls.target.set(0,0,0);
    gCamera2.up.set(0,1,0);
  }
  
	gStats.update();
  gControls.update();
  gRenderer.render(gScene, gCamera);
  RequestAnimFrame(update);
}

function init() {  
  initScene();
  scatterPhotons();
  initShaderConsts();
  initTHREE();
  RequestAnimFrame(update);
}

/* DOC READY */
$(document).ready(function() {
  
  // load shader strings
  $("#shader-fs").load("shader/render.fs", init);
  
  p = new THREE.Vector3(0, 0, 0);
  v = new THREE.Vector3(.77, -.5, .4);
	n = new THREE.Vector3(0,1,0);
});