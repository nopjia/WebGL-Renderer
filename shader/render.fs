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
  
  vec3 dist = P-s.pos;
  
  if (!s.geometry) {
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

uniform vec3 camCenter;
uniform vec3 camPos;
uniform vec3 camUp;

const vec3 ROOM_DIM = vec3(5.0, 5.0, 5.0);
const vec3 LIGHT_P = vec3(0.0, 5.0, 0.0);
const float LIGHT_I = 1.0;

const float SPEC = 30.0;
const float REFL = 0.5;
const float Ka = 0.2;
const float Kt = 0.9;
const float Kr = 0.2;
float Ks, Kd;

const int SHAPE_NUM = 3;
Shape shapes[SHAPE_NUM];

const int PHOTON_N = 5;
Photon photons[PHOTON_N];

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

vec3 computeLight(vec3 V, vec3 P, vec3 N, vec3 color) {
  vec3 L = normalize(LIGHT_P-P);
  vec3 R = reflect(L, N);
  
  return
    color*(Ka + Kd*LIGHT_I*dot(L, N)) +
    vec3(Ks*LIGHT_I*pow(max(dot(R, V), 0.0), SPEC));
}

bool intersectRoom2(vec3 P, vec3 V,
  out vec3 pos, out vec3 normal, out vec3 color) {
  
  vec3 tMin = (-ROOM_DIM-P) / V;
  vec3 tMax = (ROOM_DIM-P) / V;
  vec3 t1 = min(tMin, tMax);
  vec3 t2 = max(tMin, tMax);
  float tNear = max(max(t1.x, t1.y), t1.z);
  float tFar = min(min(t2.x, t2.y), t2.z);
  
  if (tNear<tFar && tFar>0.0) {
    // take tFar, want back of box
    
    pos = P+tFar*V;
    normal = vec3(0.0,  1.0, 0.0);
    
		if 			(pos.x < -ROOM_DIM[0]+EPS) { normal = vec3( 1.0, 0.0, 0.0); color = vec3(1.0, 1.0, 0.0); }
		else if (pos.x >  ROOM_DIM[0]-EPS) { normal = vec3(-1.0, 0.0, 0.0); color = vec3(0.0, 0.0, 1.0); }
		else if (pos.y < -ROOM_DIM[1]+EPS) {
      normal = vec3(0.0,  1.0, 0.0);
      if (fract(pos.x / 5.0) > 0.5 == fract(pos.z / 5.0) > 0.5) {
        color = vec3(0.5);
      }
      else {
        color = vec3(0.0);
      }
    }
		else if (pos.y >  ROOM_DIM[1]-EPS) { normal = vec3(0.0, -1.0, 0.0); color = vec3(0.5); }
		else if (pos.z < -ROOM_DIM[2]+EPS) { normal = vec3(0.0, 0.0,  1.0); color = vec3(0.5); }
		else { normal = vec3(0.0, 0.0, -1.0); color = vec3(0.5); }
    
    return true;
  }
  
  return false;
}

bool intersectRoom(vec3 P, vec3 V,
  out vec3 pos, out vec3 normal, out vec3 color) {
  
  if (V.y < -EPS) {
    pos = P + ((P.y + 2.5) / -V.y) * V;
    if (pos.x*pos.x + pos.z*pos.z > 25.0) {
      return false;
    }
    normal = vec3(0.0, 1.0, 0.0);
    if (fract(pos.x / 5.0) > 0.5 == fract(pos.z / 5.0) > 0.5) {
      color = vec3(1.0);
    }
    else {
      color = vec3(0.0);
    }
    return true;
  }  
  
  return false;
}

// check-only version
bool intersectWorld(vec3 P, vec3 V) {  
  float t;
  bool hit = false;
  for (int i=0; i<SHAPE_NUM; i++) {
    if (intersect(shapes[i],P,V,t)) {
      hit = true;
    }
  }
  return hit;
}
bool intersectWorld(vec3 P, vec3 V,
  out vec3 pos, out vec3 normal, out vec3 color) {
  
  float t_min = HUGE_VAL;
  
  float t;
	Shape s;
	bool hit = false;
  vec3 n, c;
  for (int i=0; i<SHAPE_NUM; i++) {
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
  
  return intersectRoom2(P,V,pos,normal,color);
}

////////////////////////////////////////////////////////////////////////////////
// RAY TRACE 
////////////////////////////////////////////////////////////////////////////////

vec4 raytrace(vec3 P, vec3 V) {
  vec3 p1, norm, p2;
  vec3 col, colT, colM, col3;
  if (intersectWorld(P, V, p1, norm, colT)) {
    col = computeLight(V, p1, norm, colT);
    colM = (colT + vec3(0.7)) / 1.7;
    
    V = reflect(V, norm);
    if (intersectWorld(p1+EPS*V, V, p2, norm, colT)) {
      col += computeLight(V, p2, norm, colT) * colM;
      colM *= (colT + vec3(0.7)) / 1.7;
      V = reflect(V, norm);
      if (intersectWorld(p2+EPS*V, V, p1, norm, colT)) {
        col += computeLight(V, p1, norm, colT) * colM;
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
  if (intersectWorld(P, V, p1, norm, colT)) {
    L = normalize(LIGHT_P-p1);
    if (!intersectWorld(p1+EPS*L, L)) {
      col = computeLight(V, p1, norm, colT);
      colM = (colT + vec3(0.7)) / 1.7;
      
      V = reflect(V, norm);
      if (intersectWorld(p1+EPS*V, V, p2, norm, colT)) {
        L = normalize(LIGHT_P-p2);
        if (!intersectWorld(p2+EPS*L, L)) {
          col += computeLight(V, p2, norm, colT) * colM;
          colM *= (colT + vec3(0.7)) / 1.7;
          V = reflect(V, norm);
          if (intersectWorld(p2+EPS*V, V, p1, norm, colT)) {
            L = normalize(LIGHT_P-p1);
            if (!intersectWorld(p1+EPS*L, L)) {
              col += computeLight(V, p1, norm, colT) * colM;
            }
          }
        }
      }
    }
  
    return vec4(col, 1.0);
  }
  else {
    return vec4(0.0, 0.0, 0.0, 1.0);
  }
}

vec4 raytracePhoton(vec3 P, vec3 V) {
  bool hit = false;
  for (int i=0; i<PHOTON_N; i++) {
    float t = dot((photons[i].pos-P),V);
    vec3 p = P+V*t;
    if (distance(p,photons[i].pos)<.1)
      hit = true;
  }
  return hit ? vec4(1.0) : vec4(0.0, 0.0, 0.0, 1.0);
}

vec4 raytraceCheck(vec3 P, vec3 V) {
  if (intersectWorld(P,V))
    return vec4(1.0);
  else
    return vec4(0.0, 0.0, 0.0, 0.0);
}

////////////////////////////////////////////////////////////////////////////////
// MAIN 
////////////////////////////////////////////////////////////////////////////////

void initScene() {
	shapes[0] = newSphere(vec3(0.0, 0.0, 0.0),  1.2, vec3(0.0, 0.0, 0.9));
  shapes[1] = newCube(vec3(2.5, -1.0, 1.5), 1.0, vec3(0.9, 0.0, 0.0));
  shapes[2] = newSphere(vec3(-1.5, 0.5, 2.0), .8, vec3(0.0, 0.9, 0.0));
}

void main(void)
{
  Ks = (1.0-Ka)*REFL;
  Kd = (1.0-Ka)*(1.0-REFL);
	
  initScene();
  //emitPhotons();
  
  photons[0] = Photon(vec3(0.0));
  photons[1] = Photon(vec3(5.0, 5.0, 5.0));
  photons[2] = Photon(vec3(-5.0, 5.0, 5.0));
  photons[3] = Photon(vec3(5.0, -5.0, 5.0));
  photons[4] = Photon(vec3(5.0, 5.0, -5.0));
  
  /* RAY TRACE */
  vec3 C = normalize(camCenter-camPos);
  vec3 A = normalize(cross(C,camUp));
  vec3 B = -normalize(cross(A,C));
  
  // scale A and B by root3/3 : fov = 30 degrees
  vec3 P = camPos+C + (2.0*vUv.x-1.0)*ROOTTHREE*A + (2.0*vUv.y-1.0)*ROOTTHREE*B;
  vec3 R1 = normalize(P-camPos);
  
  gl_FragColor = raytracePhoton(camPos, R1);
}