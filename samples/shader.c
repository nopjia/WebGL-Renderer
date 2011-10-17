#define VERTEX_TEXTURES
#define MAX_DIR_LIGHTS 0
#define MAX_POINT_LIGHTS 1
#define MAX_SHADOWS 0
#define MAX_BONES 50
#define SHADOWMAP_SOFT

uniform mat4 objectMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
uniform mat4 cameraInverseMatrix;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
attribute vec2 uv2;

#ifdef USE_COLOR
attribute vec3 color;
#endif

#ifdef USE_MORPHTARGETS
attribute vec3 morphTarget0;
attribute vec3 morphTarget1;
attribute vec3 morphTarget2;
attribute vec3 morphTarget3;
attribute vec3 morphTarget4;
attribute vec3 morphTarget5;
attribute vec3 morphTarget6;
attribute vec3 morphTarget7;
#endif

#ifdef USE_SKINNING
attribute vec4 skinVertexA;
attribute vec4 skinVertexB;
attribute vec4 skinIndex;
attribute vec4 skinWeight;
#endif