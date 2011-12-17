function println(msg) {
  $("#gl-log").append("<p>"+msg+"</p>");
}

// count number of lines
function countLines(str) {
	return str.match(/\n/g).length-1;
}

function max3(n1, n2, n3) {
  return (n1 > n2) ? ((n1 > n3) ? n1 : n3) : ((n2 > n3) ? n2 : n3);
}

function min3(n1, n2, n3) {
  return (n1 < n2) ? ((n1 < n3) ? n1 : n3) : ((n2 < n3) ? n2 : n3);
}

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

/* Vector3 */

function reflectVector3(V, N) {
	return V.clone().subSelf( N.multiplyScalar(N.dot(V)*2) );
}

function stringVector3(v) {
  return "("+v.x+" "+v.y+" "+v.z+")";
}

function getVector3(v, i) {
  switch (i) {
    case 0:
      return v.x;
    case 1:
      return v.y;
    case 2:
      return v.z;
    default:
      return null;
  }
}