#ifdef GL_ES
precision highp float;
#endif

/* CONSTANTS */
#define EPS     0.0001
#define PI      3.14159265
#define HALFPI  1.57079633
#define HUGE_VAL	1000000000.0

///////////////////////////////////////////////////////////
// SHAPE 
///////////////////////////////////////////////////////////
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

///////////////////////////////////////////////////////////
// GLOBALS 
///////////////////////////////////////////////////////////
varying vec2 vUv;

uniform vec3 camCenter;
uniform vec3 camPos;
uniform vec3 camUp;

const vec3 LIGHT_P = vec3(500.0, 1000.0, 800.0);
const float LIGHT_I = 1.0;
const float SPEC = 30.0;
const float REFL = 0.5;
const float Kr = 0.4;
const float Ka = 0.3;
const float Kt = 0.9;
float Ks, Kd;

const int SHAPE_NUM = 3;
Shape shapes[SHAPE_NUM];

///////////////////////////////////////////////////////////
// INTERSECTIONS 
///////////////////////////////////////////////////////////

vec3 computeLight(vec3 V, vec3 P, vec3 N, vec3 color) {
  vec3 L = normalize(LIGHT_P-P);
  vec3 R = reflect(L, N);
  
  return
    color*(Ka + Kd*LIGHT_I*dot(L, N)) +
    vec3(Ks*LIGHT_I*pow(max(dot(R, V), 0.0), SPEC));
}

bool intersectRoom(vec3 P, vec3 V,
  out vec3 pos, out vec3 normal, out vec3 color) {
  
  if (V.y < -0.01) {
    pos = P + ((P.y + 2.7) / -V.y) * V;
    if (abs(pos.x) > 5.0 || abs(pos.z) > 5.0) {
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
  
  return intersectRoom(P,V,pos,normal,color);
}

///////////////////////////////////////////////////////////
// MAIN 
///////////////////////////////////////////////////////////

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
  
  /* RAY TRACE */
  vec3 C = normalize(camCenter-camPos);
  vec3 A = normalize(cross(C,camUp));
  vec3 B = -normalize(cross(A,C));
  
  vec3 P = camPos+C + (2.0*vUv.x-1.0)*A + (2.0*vUv.y-1.0)*B;
  vec3 R1 = normalize(P-camPos);
  
  vec3 p1, norm, p2;
  vec3 col, colT, colM, col3;
  if (intersectWorld(camPos, R1, p1, norm, colT)) {
		col = computeLight(R1, p1, norm, colT);
		// colM = (colT + vec3(0.7)) / 1.7;
		
		// R1 = reflect(R1, norm);
		// if (intersectWorld(p1+2.0*EPS*R1, R1, p2, norm, colT)) {
			// col += computeLight(R1, p2, norm, colT) * colM;
			// colM *= (colT + vec3(0.7)) / 1.7;
			// R1 = reflect(R1, norm);
			// if (intersectWorld(p2+2.0*EPS*R1, R1, p1, norm, colT)) {
			 // col += computeLight(R1, p1, norm, colT) * colM;
			// }
		// }
  
    gl_FragColor = vec4(col, 1.0);
  }
  else {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  }
}