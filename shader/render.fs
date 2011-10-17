#ifdef GL_ES
precision highp float;
#endif

/* CONSTANTS */
#define EPS     0.0001
#define PI      3.14159265
#define HALFPI  1.57079633

/* SHAPE */
struct Shape {  
  bool geometry;
  vec3 pos;
  float radius;
  vec3 color;
};
Shape newSphere() {
  return Shape(false, vec3(0.0), 0.5, vec3(0.5, 0.5, 0.5));
}
Shape newCube() {
  return Shape(true, vec3(0.0), 0.5, vec3(0.5, 0.5, 0.5));
}
bool intersect(Shape s, vec3 P, vec3 V,
  out float t, out vec3 normal, out vec3 color) {
  
  vec3 dist = P-s.pos;
  
  if (!s.geometry) {
    float A = dot(V,V);
    float B = 2.0 * dot(V,dist);    
    float C = dot(dist,dist) - s.radius*s.radius;
    
    float d = B*B - 4.0*A*C;  // discriminant
    if (d < 0.0) return false;
    
    d = sqrt(d);
    float t = (-B-d)/(2.0*A);
    if (t > 0.0) {
      normal = (P+V*t-s.pos)/s.radius;
      color = s.color;
      return true;
    }
    
    t = (-B+d)/(2.0*A);
    if (t > 0.0) {
      normal = (P+V*t-s.pos)/s.radius;
      color = s.color;
      return true;
    }
    
    return false;
  }
  else {
    return false;
  }
}

/* GLOBALS */
varying vec2 vUv;

uniform vec3 camCenter;
uniform vec3 camPos;
uniform vec3 camUp;

const vec3 lightDir = vec3(0.577350269, 0.577350269, -0.577350269);
vec3 sphere[3];
Shape shapes[3];



bool intersectSphere(vec3 center, vec3 lStart, vec3 lDir,
                     out float dist) {
  vec3 c = center - lStart;
  float b = dot(lDir, c);
  float d = b*b - dot(c, c) + 1.0;
  if (d < 0.0) {
    dist = 10000.0;
    return false;
  }

  dist = b - sqrt(d);
  if (dist < 0.0) {
    dist = 10000.0;
    return false;
  }

  return true;
}

vec3 lightAt(vec3 N, vec3 V, vec3 color) {
  vec3 L = lightDir;
  vec3 R = reflect(-L, N);

  float c = 0.3 + 0.4 * pow(max(dot(R, V), 0.0), 30.0) + 0.7 * dot(L, N);

  if (c > 1.0) {
    return mix(color, vec3(1.6, 1.6, 1.6), c - 1.0);
  }

  return c * color;
}

bool intersectWorld(vec3 lStart, vec3 lDir, out vec3 pos,
                    out vec3 normal, out vec3 color) {
  float d1, d2, d3;
  bool h1, h2, h3;

  h1 = intersectSphere(sphere[0], lStart, lDir, d1);
  h2 = intersectSphere(sphere[1], lStart, lDir, d2);
  h3 = intersectSphere(sphere[2], lStart, lDir, d3);

  if (h1 && d1 < d2 && d1 < d3) {
    pos = lStart + d1 * lDir;
    normal = pos - sphere[0];
    color = vec3(0.0, 0.0, 0.9);
  }
  else if (h2 && d2 < d3) {
    pos = lStart + d2 * lDir;
    normal = pos - sphere[1];
    color = vec3(0.9, 0.0, 0.0);
  }
  else if (h3) {
    pos = lStart + d3 * lDir;
    normal = pos - sphere[2];
    color = vec3(0.0, 0.9, 0.0);
  }
  else if (lDir.y < -0.01) {
    pos = lStart + ((lStart.y + 2.7) / -lDir.y) * lDir;
    if (pos.x*pos.x + pos.z*pos.z > 30.0) {
      return false;
    }
    normal = vec3(0.0, 1.0, 0.0);
    if (fract(pos.x / 5.0) > 0.5 == fract(pos.z / 5.0) > 0.5) {
      color = vec3(1.0);
    }
    else {
      color = vec3(0.0);
    }
  }
  else {
   return false;
  }

  return true;
}

void main(void)
{
  sphere[0] = vec3(0.0);
  sphere[1] = vec3(2.0, -1.0, 0.5);
  sphere[2] = vec3(-1.5, 0.5, 2.0);
  
  // shapes[0] = Shape(false, vec3(0.0, 0.0, 0.0), 0.5, vec3(0.0, 0.0, 0.9));
  // shapes[1] = Shape(false, vec3(2.0, -1.0, 0.5), 0.5, vec3(0.9, 0.0, 0.0));
  // shapes[2] = Shape(false, vec3(-1.5, 0.5, 2.0), 0.5, vec3(0.0, 0.9, 0.0));
  
  /* RAY TRACE */
  vec3 C = normalize(camCenter-camPos);
  vec3 A = normalize(cross(C,camUp));
  vec3 B = -normalize(cross(A,C));
  
  vec3 P = camPos+C + (2.0*vUv.x-1.0)*A + (2.0*vUv.y-1.0)*B;
  vec3 R1 = normalize(P-camPos);
  
  vec3 p1, norm, p2;
  vec3 col, colT, colM, col3;
  if (intersectWorld(camPos, R1, p1, norm, colT)) {
   col = lightAt(norm, -R1, colT);
   colM = (colT + vec3(0.7)) / 1.7;
   R1 = reflect(R1, norm);
   if (intersectWorld(p1, R1, p2, norm, colT)) {
     col += lightAt(norm, -R1, colT) * colM;
     colM *= (colT + vec3(0.7)) / 1.7;
     R1 = reflect(R1, norm);
     if (intersectWorld(p2, R1, p1, norm, colT)) {
       col += lightAt(norm, -R1, colT) * colM;
     }
   }
  
   gl_FragColor = vec4(col, 1.0);
  }
  else {
   gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  }
}