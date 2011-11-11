
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


// recursive method - not allowed
vec3 raytrace(vec3 P, vec3 V, int depth) {
  vec3 pos, N, col, colSpec, colRefr;
  if (depth<3 && intersect(P, V, pos, N, col)) {
    // specular
    colSpec = raytrace(pos+EPS*N, reflect(V, N), depth++);  
    vec3 L = normalize(LIGHT_P-pos);
    vec3 R = reflect(L, N); 
    return
      col * (Ka + Kd*LIGHT_I*dot(L, N)) +
      colSpec * Ks*LIGHT_I*pow(max(dot(R, V), 0.0), SPEC);
  }
  else
    return vec3(0.0, 0.0, 0.0);
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