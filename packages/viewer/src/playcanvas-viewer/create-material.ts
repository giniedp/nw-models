import { BLEND_NONE, BLEND_NORMAL, CULLFACE_BACK, CULLFACE_NONE, SPECOCC_AO, StandardMaterial, Vec2, math, type Texture } from "playcanvas";

export function createMaterial(gltfMaterial: any, textures: Texture[], flipV: boolean) {
  const material = new StandardMaterial();

  // glTF doesn't define how to occlude specular
  material.occludeSpecular = SPECOCC_AO;

  material.diffuseTint = true;
  material.diffuseVertexColor = true;

  material.specularTint = true;
  material.specularVertexColor = true;

  if (gltfMaterial.hasOwnProperty('name')) {
    material.name = gltfMaterial.name;
  }

  let color, texture;
  if (gltfMaterial.hasOwnProperty('pbrMetallicRoughness')) {
    const pbrData = gltfMaterial.pbrMetallicRoughness;

    if (pbrData.hasOwnProperty('baseColorFactor')) {
      color = pbrData.baseColorFactor;
      // Convert from linear space to sRGB space
      material.diffuse.set(Math.pow(color[0], 1 / 2.2), Math.pow(color[1], 1 / 2.2), Math.pow(color[2], 1 / 2.2));
      material.opacity = color[3];
    } else {
      material.diffuse.set(1, 1, 1);
      material.opacity = 1;
    }
    if (pbrData.hasOwnProperty('baseColorTexture')) {
      const baseColorTexture = pbrData.baseColorTexture;
      texture = textures[baseColorTexture.index];

      material.diffuseMap = texture;
      material.diffuseMapChannel = 'rgb';
      material.opacityMap = texture;
      material.opacityMapChannel = 'a';

      extractTextureTransform(baseColorTexture, material, ['diffuse', 'opacity']);
    }
    material.useMetalness = true;
    material.specular.set(1, 1, 1);
    if (pbrData.hasOwnProperty('metallicFactor')) {
      material.metalness = pbrData.metallicFactor;
    } else {
      material.metalness = 1;
    }
    if (pbrData.hasOwnProperty('roughnessFactor')) {
      material.gloss = pbrData.roughnessFactor;
    } else {
      material.gloss = 1;
    }
    material.glossInvert = true;
    if (pbrData.hasOwnProperty('metallicRoughnessTexture')) {
      const metallicRoughnessTexture = pbrData.metallicRoughnessTexture;
      material.metalnessMap = material.glossMap = textures[metallicRoughnessTexture.index];
      material.metalnessMapChannel = 'b';
      material.glossMapChannel = 'g';

      extractTextureTransform(metallicRoughnessTexture, material, ['gloss', 'metalness']);
    }
  }

  if (gltfMaterial.hasOwnProperty('normalTexture')) {
    const normalTexture = gltfMaterial.normalTexture;
    material.normalMap = textures[normalTexture.index];

    extractTextureTransform(normalTexture, material, ['normal']);

    if (normalTexture.hasOwnProperty('scale')) {
      material.bumpiness = normalTexture.scale;
    }
  }
  if (gltfMaterial.hasOwnProperty('occlusionTexture')) {
    const occlusionTexture = gltfMaterial.occlusionTexture;
    material.aoMap = textures[occlusionTexture.index];
    material.aoMapChannel = 'r';

    extractTextureTransform(occlusionTexture, material, ['ao']);
    // TODO: support 'strength'
  }
  if (gltfMaterial.hasOwnProperty('emissiveFactor')) {
    color = gltfMaterial.emissiveFactor;
    // Convert from linear space to sRGB space
    material.emissive.set(Math.pow(color[0], 1 / 2.2), Math.pow(color[1], 1 / 2.2), Math.pow(color[2], 1 / 2.2));
    material.emissiveTint = true;
  } else {
    material.emissive.set(0, 0, 0);
    material.emissiveTint = false;
  }
  if (gltfMaterial.hasOwnProperty('emissiveTexture')) {
    const emissiveTexture = gltfMaterial.emissiveTexture;
    material.emissiveMap = textures[emissiveTexture.index];

    extractTextureTransform(emissiveTexture, material, ['emissive']);
  }
  if (gltfMaterial.hasOwnProperty('alphaMode')) {
    switch (gltfMaterial.alphaMode) {
      case 'MASK':
        material.blendType = BLEND_NONE;
        if (gltfMaterial.hasOwnProperty('alphaCutoff')) {
          material.alphaTest = gltfMaterial.alphaCutoff;
        } else {
          material.alphaTest = 0.5;
        }
        break;
      case 'BLEND':
        material.blendType = BLEND_NORMAL;
        // note: by default don't write depth on semitransparent materials
        material.depthWrite = false;
        break;
      default:
      case 'OPAQUE':
        material.blendType = BLEND_NONE;
        break;
    }
  } else {
    material.blendType = BLEND_NONE;
  }

  if (gltfMaterial.hasOwnProperty('doubleSided')) {
    material.twoSidedLighting = gltfMaterial.doubleSided;
    material.cull = gltfMaterial.doubleSided ? CULLFACE_NONE : CULLFACE_BACK;
  } else {
    material.twoSidedLighting = false;
    material.cull = CULLFACE_BACK;
  }

  // Provide list of supported extensions and their functions
  const extensions: Record<string, Function> = {
    //"KHR_materials_clearcoat": extensionClearCoat,
    //"KHR_materials_emissive_strength": extensionEmissiveStrength,
    //"KHR_materials_ior": extensionIor,
    //"KHR_materials_iridescence": extensionIridescence,
    "KHR_materials_pbrSpecularGlossiness": extensionPbrSpecGlossiness,
    //"KHR_materials_sheen": extensionSheen,
    "KHR_materials_specular": extensionSpecular,
    //"KHR_materials_transmission": extensionTransmission,
    //"KHR_materials_unlit": extensionUnlit,
    //"KHR_materials_volume": extensionVolume
    "EXT_new_world_appearance": extensionNewWorldAppearance
  };

  // Handle extensions
  if (gltfMaterial.hasOwnProperty('extensions')) {
    for (const key in gltfMaterial.extensions) {
      const extensionFunc = extensions[key];
      if (extensionFunc !== undefined) {
        extensionFunc(gltfMaterial.extensions[key], material, textures);
      }
    }
  }

  material.update();

  return material;
};

export function extensionSpecular(data: any, material: any, textures: Texture[]) {
  material.useMetalnessSpecularColor = true;
  if (data.hasOwnProperty('specularColorTexture')) {
    material.specularEncoding = 'srgb';
    material.specularMap = textures[data.specularColorTexture.index];
    material.specularMapChannel = 'rgb';

    extractTextureTransform(data.specularColorTexture, material, ['specular']);

  }
  if (data.hasOwnProperty('specularColorFactor')) {
    const color = data.specularColorFactor;
    material.specular.set(Math.pow(color[0], 1 / 2.2), Math.pow(color[1], 1 / 2.2), Math.pow(color[2], 1 / 2.2));
  } else {
    material.specular.set(1, 1, 1);
  }

  if (data.hasOwnProperty('specularFactor')) {
    material.specularityFactor = data.specularFactor;
  } else {
    material.specularityFactor = 1;
  }
  if (data.hasOwnProperty('specularTexture')) {
    material.specularityFactorMapChannel = 'a';
    material.specularityFactorMap = textures[data.specularTexture.index];
    extractTextureTransform(data.specularTexture, material, ['specularityFactor']);
  }
}

export function extensionPbrSpecGlossiness(data: any, material: any, textures: Texture[]) {
  let color, texture;
  if (data.hasOwnProperty('diffuseFactor')) {
    color = data.diffuseFactor;
    // Convert from linear space to sRGB space
    material.diffuse.set(Math.pow(color[0], 1 / 2.2), Math.pow(color[1], 1 / 2.2), Math.pow(color[2], 1 / 2.2));
    material.opacity = color[3];
  } else {
    material.diffuse.set(1, 1, 1);
    material.opacity = 1;
  }
  if (data.hasOwnProperty('diffuseTexture')) {
    const diffuseTexture = data.diffuseTexture;
    texture = textures[diffuseTexture.index];

    material.diffuseMap = texture;
    material.diffuseMapChannel = 'rgb';
    material.opacityMap = texture;
    material.opacityMapChannel = 'a';

    extractTextureTransform(diffuseTexture, material, ['diffuse', 'opacity']);
  }
  material.useMetalness = false;
  if (data.hasOwnProperty('specularFactor')) {
    color = data.specularFactor;
    // Convert from linear space to sRGB space
    material.specular.set(Math.pow(color[0], 1 / 2.2), Math.pow(color[1], 1 / 2.2), Math.pow(color[2], 1 / 2.2));
  } else {
    material.specular.set(1, 1, 1);
  }
  if (data.hasOwnProperty('glossinessFactor')) {
    material.gloss = data.glossinessFactor;
  } else {
    material.gloss = 1.0;
  }
  if (data.hasOwnProperty('specularGlossinessTexture')) {
    const specularGlossinessTexture = data.specularGlossinessTexture;
    material.specularEncoding = 'srgb';
    material.specularMap = material.glossMap = textures[specularGlossinessTexture.index];
    material.specularMapChannel = 'rgb';
    material.glossMapChannel = 'a';

    extractTextureTransform(specularGlossinessTexture, material, ['gloss', 'metalness']);
  }
};

export function extractTextureTransform(source: any, material: any, maps: string[]) {
  let map;

  const texCoord = source.texCoord;
  if (texCoord) {
    for (map = 0; map < maps.length; ++map) {
      material[maps[map] + 'MapUv'] = texCoord;
    }
  }

  const zeros = [0, 0];
  const ones = [1, 1];
  const textureTransform = source.extensions?.KHR_texture_transform;
  if (textureTransform) {
    const offset = textureTransform.offset || zeros;
    const scale = textureTransform.scale || ones;
    const rotation = textureTransform.rotation ? (-textureTransform.rotation * math.RAD_TO_DEG) : 0;

    const tilingVec = new Vec2(scale[0], scale[1]);
    const offsetVec = new Vec2(offset[0], 1.0 - scale[1] - offset[1]);

    for (map = 0; map < maps.length; ++map) {
      material[`${maps[map]}MapTiling`] = tilingVec;
      material[`${maps[map]}MapOffset`] = offsetVec;
      material[`${maps[map]}MapRotation`] = rotation;
    }
  }
};

const EXT_new_world_appearance = 'EXT_new_world_appearance'
interface NewWorldAppearanceJson {
  data: any
  maskTexture: {
    index: number
  }
}

export function extensionNewWorldAppearance(data: NewWorldAppearanceJson, material: any, textures: Texture[]) {
  if (data.data) {
    material.nwAppearance = data.data
  }
  if (data.maskTexture) {
    const texture = textures[data.maskTexture.index];
    extractTextureTransform(texture, material, ['diffuse', 'opacity']);
    material.nwMaskTexture = texture
  }
};