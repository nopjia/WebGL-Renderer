/**************** VERTEX ****************/

attribute vec4 tangent;

#ifdef VERTEX_TEXTURES

	uniform sampler2D tDisplacement;
	uniform float uDisplacementScale;
	uniform float uDisplacementBias;

#endif

varying vec3 vTangent;
varying vec3 vBinormal;
varying vec3 vNormal;
varying vec2 vUv;

#if MAX_POINT_LIGHTS > 0

	uniform vec3 pointLightPosition[ MAX_POINT_LIGHTS ];
	uniform float pointLightDistance[ MAX_POINT_LIGHTS ];

	varying vec4 vPointLight[ MAX_POINT_LIGHTS ];

#endif

varying vec3 vViewPosition;

void main() {

	vec4 mPosition = objectMatrix * vec4( position, 1.0 );

	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

	vViewPosition = -mvPosition.xyz;

	vNormal = normalize( normalMatrix * normal );

	// tangent and binormal vectors

	vTangent = normalize( normalMatrix * tangent.xyz );

	vBinormal = cross( vNormal, vTangent ) * tangent.w;
	vBinormal = normalize( vBinormal );

	vUv = uv;

	// point lights

	#if MAX_POINT_LIGHTS > 0

		for( int i = 0; i < MAX_POINT_LIGHTS; i++ ) {

			vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );

			vec3 lVector = lPosition.xyz - mvPosition.xyz;

			float lDistance = 1.0;

			if ( pointLightDistance[ i ] > 0.0 ),
				lDistance = 1.0 - min( ( length( lVector ) / pointLightDistance[ i ] ), 1.0 );

			lVector = normalize( lVector );

			vPointLight[ i ] = vec4( lVector, lDistance );

		}

	#endif

	// displacement mapping

	#ifdef VERTEX_TEXTURES,

		vec3 dv = texture2D( tDisplacement, uv ).xyz;
		float df = uDisplacementScale * dv.x + uDisplacementBias;
		vec4 displacedPosition = vec4( vNormal.xyz * df, 0.0 ) + mvPosition;
		gl_Position = projectionMatrix * displacedPosition;

	#else,

		gl_Position = projectionMatrix * mvPosition;

	#endif,

}

/**************** FRAGMENT ****************/

uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
uniform float uShininess;
uniform float uOpacity;

uniform bool enableDiffuse;
uniform bool enableSpecular;
uniform bool enableAO;

uniform sampler2D tDiffuse;
uniform sampler2D tNormal;
uniform sampler2D tSpecular;
uniform sampler2D tAO;

uniform float uNormalScale;

varying vec3 vTangent;
varying vec3 vBinormal;
varying vec3 vNormal;
varying vec2 vUv;

uniform vec3 ambientLightColor;

#if MAX_DIR_LIGHTS > 0
	uniform vec3 directionalLightColor[ MAX_DIR_LIGHTS ];
	uniform vec3 directionalLightDirection[ MAX_DIR_LIGHTS ];
#endif

#if MAX_POINT_LIGHTS > 0
	uniform vec3 pointLightColor[ MAX_POINT_LIGHTS ];
	varying vec4 vPointLight[ MAX_POINT_LIGHTS ];
#endif

varying vec3 vViewPosition;



void main() {

	gl_FragColor = vec4( 1.0 );

	vec4 mColor = vec4( uDiffuseColor, uOpacity );
	vec4 mSpecular = vec4( uSpecularColor, uOpacity );

	vec3 specularTex = vec3( 1.0 );

	vec3 normalTex = texture2D( tNormal, vUv ).xyz * 2.0 - 1.0;
	normalTex.xy *= uNormalScale;
	normalTex = normalize( normalTex );

	if( enableDiffuse ),
		gl_FragColor = gl_FragColor * texture2D( tDiffuse, vUv );

	if( enableAO ),
		gl_FragColor = gl_FragColor * texture2D( tAO, vUv );

	if( enableSpecular ),
		specularTex = texture2D( tSpecular, vUv ).xyz;

	mat3 tsb = mat3( vTangent, vBinormal, vNormal );
	vec3 finalNormal = tsb * normalTex;

	vec3 normal = normalize( finalNormal );
	vec3 viewPosition = normalize( vViewPosition );

	// point lights

	#if MAX_POINT_LIGHTS > 0,

		vec4 pointTotal = vec4( vec3( 0.0 ), 1.0 );

		for ( int i = 0; i < MAX_POINT_LIGHTS; i ++ ) {

			vec3 pointVector = normalize( vPointLight[ i ].xyz );
			vec3 pointHalfVector = normalize( vPointLight[ i ].xyz + viewPosition );
			float pointDistance = vPointLight[ i ].w;

			float pointDotNormalHalf = dot( normal, pointHalfVector );
			float pointDiffuseWeight = max( dot( normal, pointVector ), 0.0 );

			float pointSpecularWeight = 0.0;
			if ( pointDotNormalHalf >= 0.0 ),
				pointSpecularWeight = specularTex.r * pow( pointDotNormalHalf, uShininess );

			pointTotal  += pointDistance * vec4( pointLightColor[ i ], 1.0 ) * ( mColor * pointDiffuseWeight + mSpecular * pointSpecularWeight * pointDiffuseWeight );

		}

	#endif,

	// directional lights

	#if MAX_DIR_LIGHTS > 0,

		vec4 dirTotal = vec4( vec3( 0.0 ), 1.0 );

		for( int i = 0; i < MAX_DIR_LIGHTS; i++ ) {

			vec4 lDirection = viewMatrix * vec4( directionalLightDirection[ i ], 0.0 );

			vec3 dirVector = normalize( lDirection.xyz );
			vec3 dirHalfVector = normalize( lDirection.xyz + viewPosition );

			float dirDotNormalHalf = dot( normal, dirHalfVector );
			float dirDiffuseWeight = max( dot( normal, dirVector ), 0.0 );

			float dirSpecularWeight = 0.0;
			if ( dirDotNormalHalf >= 0.0 ),
				dirSpecularWeight = specularTex.r * pow( dirDotNormalHalf, uShininess );

			dirTotal  += vec4( directionalLightColor[ i ], 1.0 ) * ( mColor * dirDiffuseWeight + mSpecular * dirSpecularWeight * dirDiffuseWeight );

		}

	#endif,

	// all lights contribution summation

	vec4 totalLight = vec4( ambientLightColor * uAmbientColor, uOpacity );

	#if MAX_DIR_LIGHTS > 0,
		totalLight += dirTotal;
	#endif,

	#if MAX_POINT_LIGHTS > 0,
		totalLight += pointTotal;
	#endif,

	gl_FragColor = gl_FragColor * totalLight;

	THREE.ShaderChunk[ fog_fragment ],

}
