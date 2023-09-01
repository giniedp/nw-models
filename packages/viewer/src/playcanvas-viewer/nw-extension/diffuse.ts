export const diffusePS = /* glsl */`
#ifdef MAPCOLOR
uniform vec3 material_diffuse;
#endif

// CUSTOM BLOCK BEGIN
uniform sampler2D dyeMask;
uniform vec4 dyeColorR;
uniform vec4 dyeColorG;
uniform vec4 dyeColorB;
uniform vec4 dyeColorA;
uniform vec2 dyeParams;
// CUSTOM BLOCK END

void getAlbedo() {
  dAlbedo = vec3(1.0);

#ifdef MAPCOLOR
  dAlbedo *= material_diffuse.rgb;
#endif

#ifdef MAPTEXTURE
  vec3 albedoBase = $DECODE(texture2DBias($SAMPLER, $UV, textureBias)).$CH;
  dAlbedo *= addAlbedoDetail(albedoBase);
#endif

// CUSTOM BLOCK BEGIN
if (dyeParams.x > 0.0) {
  // TODO: use defines for this
  vec4 maskTexture = texture2D(dyeMask, $UV);
  
   float luminance = dot(dAlbedo, vec3(0.299, 0.587, 0.114));
   dAlbedo = mix(dAlbedo, luminance * dyeColorR.rgb, maskTexture.r * dyeColorR.a);
   dAlbedo = mix(dAlbedo, luminance * dyeColorG.rgb, maskTexture.g * dyeColorG.a);
   dAlbedo = mix(dAlbedo, luminance * dyeColorB.rgb, maskTexture.b * dyeColorB.a);
   dAlbedo = mix(dAlbedo, luminance * dyeColorA.rgb, maskTexture.a * dyeColorA.a);
  
  if (dyeParams.y > 0.0) {
    dAlbedo = mix(maskTexture.rgb, vec3(1.0, 0.0, 1.0), maskTexture.a);
  }
}
// CUSTOM BLOCK END

#ifdef MAPVERTEX
  dAlbedo *= gammaCorrectInput(saturate(vVertexColor.$VC));
#endif
}
`;
