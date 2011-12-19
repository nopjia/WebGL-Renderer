#ifdef GL_ES
precision highp float;
#endif

/* CONSTANTS */
#define EPS     0.0001
#define PI      3.14159265
#define HALFPI  1.57079633
#define ROOTTHREE 0.57735027
#define HUGE_VAL	1000000000.0

////////////////////////////////////////////////////////////////////////////////
// SHAPE 
////////////////////////////////////////////////////////////////////////////////
struct Shape {  
  bool geometry;
  vec3 pos;
  float radius;
  vec3 color;
};
Shape newSphere() {
  return Shape(false, vec3(0.0), 0.5, vec3(0.5, 0.5, 0.5));
}
Shape newSphere(vec3 p, float r, vec3 c) {
	Shape s = Shape(false, p, r, c);
  return s;
}
Shape newCube() {
  return Shape(true, vec3(0.0), 0.5, vec3(0.5, 0.5, 0.5));
}
Shape newCube(vec3 p, float r, vec3 c) {
	Shape s = Shape(true, p, r, c);
  return s;
}
bool intersect(Shape s, vec3 P, vec3 V, out float t) {    
  if (!s.geometry) {    
    vec3 dist = P-s.pos;
    
    float A = dot(V,V);
    float B = 2.0 * dot(dist,V);    
    float C = dot(dist,dist) - s.radius*s.radius;
    
    float d = B*B - 4.0*A*C;  // discriminant
    if (d < 0.0) return false;
    
    d = sqrt(d);
    t = (-B-d)/(2.0*A);
    if (t > 0.0) {
      return true;
    }
    
    t = (-B+d)/(2.0*A);
    if (t > 0.0) {
      return true;
    }
    
    return false;
  }
  else {
    vec3 bMin = s.pos - vec3(s.radius);
    vec3 bMax = s.pos + vec3(s.radius);
    
    vec3 tMin = (bMin-P) / V;
    vec3 tMax = (bMax-P) / V;
    vec3 t1 = min(tMin, tMax);
    vec3 t2 = max(tMin, tMax);
    float tNear = max(max(t1.x, t1.y), t1.z);
    float tFar = min(min(t2.x, t2.y), t2.z);
    
    if (tNear<tFar && tFar>0.0) {
	    t = tNear>0.0 ? tNear : tFar;
	    return true;
    }
    
    return false;
  }
}
vec3 getNormal(Shape s, vec3 hit) {
	if (!s.geometry) {
		return (hit-s.pos)/s.radius;
	}
	else {
		vec3 p = hit-s.pos;
		if 			(p.x < -s.radius+EPS) return vec3(-1.0, 0.0, 0.0);
		else if (p.x >  s.radius-EPS) return vec3( 1.0, 0.0, 0.0);
		else if (p.y < -s.radius+EPS) return vec3(0.0, -1.0, 0.0);
		else if (p.y >  s.radius-EPS) return vec3(0.0,  1.0, 0.0);
		else if (p.z < -s.radius+EPS) return vec3(0.0, 0.0, -1.0);
		else return vec3(0.0, 0.0, 1.0);
	}
}

////////////////////////////////////////////////////////////////////////////////
// PHOTON
////////////////////////////////////////////////////////////////////////////////

struct Photon {  
  vec3 pos;
};

////////////////////////////////////////////////////////////////////////////////
// GLOBALS 
////////////////////////////////////////////////////////////////////////////////

varying vec2 vUv;

uniform vec3 uCamCenter;
uniform vec3 uCamPos;
uniform vec3 uCamUp;

uniform float uBlend;

const vec3 uRoomDim = vec3(5.0, 5.0, 5.0);
const vec3 uLightP = vec3(0.0, 4.9, 0.0);
const float uLightI = 1.0;

const float SPEC = 30.0;
const float REFL = 0.5;
const float Ka = 0.2;
const float Kt = 0.9;
const float Kr = 0.8;
float Ks, Kd;

Shape shapes[SHAPE_N];
uniform vec3 uShapeP[SHAPE_N];
uniform vec3 uShapeC[SHAPE_N];
uniform float uShapeR[SHAPE_N];

uniform sampler2D uCTex;
uniform sampler2D uPTex;
uniform sampler2D uITex;

////////////////////////////////////////////////////////////////////////////////
// GLOBAL FUNCTIONS
////////////////////////////////////////////////////////////////////////////////

float rand() {
  return fract(
    sin(
      dot(gl_FragCoord.xyz, vec3(93.5734, 12.9898, 78.2331))
    ) * 43758.5453
  );
}

// from Evan Wallace
vec3 uniformRandomDirection() {
	float u = rand();
	float v = rand();
	float z = 1.0 - 2.0 * u;
	float r = sqrt(1.0 - z * z);
	float angle = 6.283185307179586 * v;
	return vec3(r * cos(angle), r * sin(angle), z);
}

// negative Y direction
vec3 uniformRandomDirectionNY() {
  float u = rand();
	float v = rand();
	float y = -1.0 * u;
	float r = sqrt(1.0 - y * y);
	float angle = 6.283185307179586 * v;
	return vec3(r * cos(angle), y, r * sin(angle));
}

////////////////////////////////////////////////////////////////////////////////
// INTERSECTIONS 
////////////////////////////////////////////////////////////////////////////////

vec3 computeLight(vec3 P, vec3 V, vec3 N, vec3 color) {
  vec3 L = normalize(uLightP-P);
  vec3 R = reflect(L, N);
  
  return
    color*(Ka + Kd*uLightI*dot(L, N)) +
    vec3(Ks*uLightI*pow(max(dot(R, V), 0.0), SPEC));
}

bool intersectRoom(vec3 P, vec3 V,
  out vec3 pos, out vec3 normal, out vec3 color) {
  
  vec3 tMin = (-uRoomDim-P) / V;
  vec3 tMax = (uRoomDim-P) / V;
  vec3 t1 = min(tMin, tMax);
  vec3 t2 = max(tMin, tMax);
  float tNear = max(max(t1.x, t1.y), t1.z);
  float tFar = min(min(t2.x, t2.y), t2.z);
  
  if (tNear<tFar && tFar>0.0) {
    // take tFar, want back of box
    
    pos = P+tFar*V;
    
		if 			(pos.x < -uRoomDim.x+EPS) { normal = vec3( 1.0, 0.0, 0.0); color = vec3(1.0, 1.0, 0.0); }
		else if (pos.x >  uRoomDim.x-EPS) { normal = vec3(-1.0, 0.0, 0.0); color = vec3(0.0, 0.0, 1.0); }
		else if (pos.y < -uRoomDim.y+EPS) {
      normal = vec3(0.0,  1.0, 0.0);
      color = vec3(0.5);
      //if (fract(pos.x / 5.0) > 0.5 == fract(pos.z / 5.0) > 0.5) {
      //  color = vec3(0.5);
      //}
      //else {
      //  color = vec3(0.0);
      //}
    }
		else if (pos.y >  uRoomDim.y-EPS) { normal = vec3(0.0, -1.0, 0.0); color = vec3(0.5); }
		else if (pos.z < -uRoomDim.z+EPS) { normal = vec3(0.0, 0.0,  1.0); color = vec3(0.5); }
		else { normal = vec3(0.0, 0.0, -1.0); color = vec3(0.5); }
    
    return true;
  }
  
  return false;
}

// indexed version
bool intersectRoom(vec3 P, vec3 V,
  out vec3 pos, out vec3 normal, out vec3 color, out int idx) {
  
  vec3 tMin = (-uRoomDim-P) / V;
  vec3 tMax = (uRoomDim-P) / V;
  vec3 t1 = min(tMin, tMax);
  vec3 t2 = max(tMin, tMax);
  float tNear = max(max(t1.x, t1.y), t1.z);
  float tFar = min(min(t2.x, t2.y), t2.z);
  
  if (tNear<tFar && tFar>0.0) {
    // take tFar, want back of box
    
    pos = P+tFar*V;
    
		if 			(pos.x < -uRoomDim.x+EPS) { normal = vec3( 1.0, 0.0, 0.0); idx = 0; color = vec3(1.0, 1.0, 0.0); }
		else if (pos.x >  uRoomDim.x-EPS) { normal = vec3(-1.0, 0.0, 0.0); idx = 1; color = vec3(0.0, 0.0, 1.0); }
		else if (pos.y < -uRoomDim.y+EPS) { normal = vec3(0.0,  1.0, 0.0); idx = 2; color = vec3(0.5); }
		else if (pos.y >  uRoomDim.y-EPS) { normal = vec3(0.0, -1.0, 0.0); idx = 3; color = vec3(0.5); }
		else if (pos.z < -uRoomDim.z+EPS) { normal = vec3(0.0, 0.0,  1.0); idx = 4; color = vec3(0.5); }
		else { normal = vec3(0.0, 0.0, -1.0); idx = 5; color = vec3(0.5); }
    
    return true;
  }
  
  return false;
}

// check-only version
bool intersectWorld(vec3 P, vec3 V) {  
  float t;
  for (int i=0; i<SHAPE_N; i++) {
    if (intersect(shapes[i],P,V,t)) {
      return true;
    }
  }
  return false;
}
bool intersectWorld(vec3 P, vec3 V,
  out vec3 pos, out vec3 normal, out vec3 color) {
  
  float t_min = HUGE_VAL;
  
  float t;
	Shape s;
	bool hit = false;
  vec3 n, c;
  for (int i=0; i<SHAPE_N; i++) {
    if (intersect(shapes[i],P,V,t) && t<t_min) {
      t_min=t;
			hit = true;
			s = shapes[i];
    }
  }
  
  if (hit) {
    pos = P+V*t_min;
		normal = getNormal(s, pos);
		color = s.color;
    return true;
  }
  
  return intersectRoom(P,V,pos,normal,color);
}
// indexed version
bool intersectWorld(vec3 P, vec3 V,
  out vec3 pos, out vec3 normal, out vec3 color, out int idx) {
  
  float t_min = HUGE_VAL;
  
  float t;
	Shape s;
	bool hit = false;
  vec3 n, c;
  for (int i=0; i<SHAPE_N; i++) {
    if (intersect(shapes[i],P,V,t) && t<t_min) {
      t_min=t;
			hit = true;
			s = shapes[i];
      idx = i;
    }
  }
  
  if (hit) {
    pos = P+V*t_min;
		normal = getNormal(s, pos);
		color = s.color;
		idx += 6;		// offset 6 for room
    return true;
  }
  
  return intersectRoom(P,V,pos,normal,color,idx);
}
// check & indexed version
bool intersectWorld(vec3 P, vec3 V, int idx) {  
  float t;
  for (int i=0; i<SHAPE_N; i++) {
    if (i!=idx && intersect(shapes[i],P,V,t)) {
      return true;
    }
  }
  return false;
}

////////////////////////////////////////////////////////////////////////////////
// RAY TRACE 
////////////////////////////////////////////////////////////////////////////////

vec4 raytrace(vec3 P, vec3 V) {
  vec3 p1, norm, p2;
  vec3 col, colT, colM, col3;
  if (intersectWorld(P, V, p1, norm, colT)) {
    col = computeLight(p1, V, norm, colT);
    colM = (colT + vec3(0.7)) / 1.7;
    
    V = reflect(V, norm);
    if (intersectWorld(p1+EPS*V, V, p2, norm, colT)) {
      col += computeLight(p2, V, norm, colT) * colM;
      colM *= (colT + vec3(0.7)) / 1.7;
      V = reflect(V, norm);
      if (intersectWorld(p2+EPS*V, V, p1, norm, colT)) {
        col += computeLight(p1, V, norm, colT) * colM;
      }
    }
  
    return vec4(col, 1.0);
  }
  else {
    return vec4(0.0, 0.0, 0.0, 1.0);
  }
}

vec4 raytraceShadow(vec3 P, vec3 V) {
  vec3 p1, norm, p2;
  vec3 col, colT, colM, col3;
  vec3 L;
  int idx;
  if (intersectWorld(P, V, p1, norm, colT, idx)) {
    L = normalize(uLightP-p1);
    if (!intersectWorld(p1+EPS*L, L, idx))
      col = computeLight(p1, V, norm, colT);
    colM = (colT + vec3(0.7)) / 1.7;
    
		/*
    V = reflect(V, norm);
    if (intersectWorld(p1+EPS*V, V, p2, norm, colT, idx)) {
      L = normalize(uLightP-p2);
      if (!intersectWorld(p2+EPS*L, L, idx))
        col += computeLight(p2, V, norm, colT) * colM;
      colM *= (colT + vec3(0.7)) / 1.7;
      
      V = reflect(V, norm);
      if (intersectWorld(p2+EPS*V, V, p1, norm, colT, idx)) {
        L = normalize(uLightP-p1);
        if (!intersectWorld(p1+EPS*L, L, idx))
          col += computeLight(p1, V, norm, colT) * colM;
      }      
    } */ 
  
    return vec4(col, 1.0);
  }
  else {
    return vec4(0.0, 0.0, 0.0, 1.0);
  }
}

vec4 raytraceCheck(vec3 P, vec3 V) {
  return intersectWorld(P,V) ? vec4(1.0) : vec4(0.0, 0.0, 0.0, 1.0);
}

////////////////////////////////////////////////////////////////////////////////
// PHOTON GATHER
////////////////////////////////////////////////////////////////////////////////

vec3 getPhotonC(vec2 lookup) {
	return texture2D(uCTex, lookup).rgb;
}

vec3 getPhotonP(vec2 lookup) {
	return texture2D(uPTex, lookup).rgb * 10.0 - 5.0;
}

vec3 getPhotonI(vec2 lookup) {
	return texture2D(uITex, lookup).rgb * 2.0 - 1.0;
}

#define GATHER_SQRAD 8.0
#define GATHER_RAD 2.8
#define ALPHA 0.1918
#define BETA 1.953
// precomputed from Gaussian formula
#define GAUSS_INNOM -.1440625
#define GAUSS_DENOM .858152111

vec3 gatherPhotons(vec3 p, vec3 norm, int idx) {
	
	vec3 col = vec3(0.0);
	
	/* PHOTON_GATHER_CODE_JS_INJECT */
	
	return col;
}

vec4 raytraceGather(vec3 P, vec3 V) {
  vec3 col = vec3(0.0);
  vec3 p, norm, coli;
  int idx;
  if (intersectWorld(P, V, p, norm, coli, idx)) {		
    for (int i=0; i<PHOTON_N; i++) {
			vec2 lookup = vec2((float(i)+0.5)*PHOTON_N_INV, 0.0);
			vec3 diff = getPhotonP(lookup)-p;
			float sqdist = dot(diff,diff);

			col += getPhotonC(lookup)
				* max(0.0, -dot(norm, getPhotonI(lookup)))
				* max(0.0, ALPHA*( 1.0-(1.0-exp(GAUSS_INNOM*sqdist))/GAUSS_DENOM ));
    }
	}
	return vec4(col, 1.0);
}

vec4 test(vec3 P, vec3 V) {  
  vec3 col = vec3(0.0);
  vec3 p, norm, coli;
  int idx;
  if (intersectWorld(P, V, p, norm, coli, idx)) {
		
		vec3 L = normalize(uLightP-p);
				
		//if (idx==6) {
		//	vec3 Vi, Pi, pi, ni;
		//	int idxi;
		//				
		//	Vi = reflect(V, norm);
		//	Pi = p+EPS*Vi;
		//	if (intersectWorld(Pi, Vi, pi, ni, coli, idxi)) {
		//		col += 0.3*gatherPhotons(pi, ni, idxi);
		//	}
		//	
		//	Vi = refract(V, norm, 0.8);
		//	Pi = p+EPS*Vi;
		//	intersectWorld(Pi, Vi, pi, ni, coli, idxi);
		//	Vi = refract(Vi, -ni, 0.8);
		//	Pi = pi+EPS*Vi;
		//	if (intersectWorld(Pi, Vi, pi, ni, coli, idxi)) {
		//		col += 0.7*gatherPhotons(pi, ni, idxi);
		//	}
		//	
		//	// add specular
		//	vec3 R = reflect(L, norm);
		//	col += 0.5*pow(max(dot(R, V), 0.0), SPEC);
		//}
		//
		//if (idx!=6)		
			col += gatherPhotons(p, norm, idx);		
		
		// add shadow
    if (intersectWorld(p+EPS*L, L, idx-6))
			col *= 0.3;
	}
	return vec4(col, 1.0);
}
#undef ALPHA
#undef BETA
#undef GAUSS_INNOM
#undef GAUSS_DENOM

////////////////////////////////////////////////////////////////////////////////
// MAIN 
////////////////////////////////////////////////////////////////////////////////

void initScene() {  
  for (int i=0; i<SHAPE_N_TI; i++) {
			shapes[i] = newSphere(uShapeP[i], uShapeR[i], uShapeC[i]);
  }
	for (int i=SHAPE_N_TI; i<SHAPE_N; i++) {
			shapes[i] = newCube(uShapeP[i], uShapeR[i], uShapeC[i]);
  }
}

void main(void)
{
  Ks = (1.0-Ka)*REFL;
  Kd = (1.0-Ka)*(1.0-REFL);
	
  initScene();
  
  /* RAY TRACE */
  vec3 C = normalize(uCamCenter-uCamPos);
  vec3 A = normalize(cross(C,uCamUp));
  vec3 B = -normalize(cross(A,C));
  
  // scale A and B by root3/3 : fov = 30 degrees
  vec3 P = uCamPos+C + (2.0*vUv.x-1.0)*ROOTTHREE*A + (2.0*vUv.y-1.0)*ROOTTHREE*B;
  vec3 R1 = normalize(P-uCamPos);
  
  //gl_FragColor = raytrace(uCamPos, R1);
  //gl_FragColor = raytraceShadow(uCamPos, R1);
  //gl_FragColor = raytraceGather(uCamPos, R1);
	gl_FragColor = test(uCamPos, R1);
  //gl_FragColor = vec4(0.9, 0.0, 0.9, 1.0);
	
	//if (Ks < 0.0)
	//	gl_FragColor = raytraceGather(uCamPos, R1);
		
	//if (vUv.y < 0.4)
	//	gl_FragColor = vec4(getPhotonC(vUv), 1.0);
	//else if (vUv.y < 0.7)
	//	gl_FragColor = vec4(getPhotonP(vUv), 1.0);
	//else
	//	gl_FragColor = vec4(getPhotonI(vUv), 1.0);

	//gl_FragColor = mix(
	//	raytraceShadow(uCamPos, R1),
	//	raytraceGather(uCamPos, R1),
	//	uBlend
	//);
	
}