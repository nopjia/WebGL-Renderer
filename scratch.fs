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