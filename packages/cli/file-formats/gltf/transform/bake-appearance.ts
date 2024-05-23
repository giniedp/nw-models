import { Document } from '@gltf-transform/core'
import { createTransform } from '@gltf-transform/functions'
import { NwAppearanceExtension } from '../extensions/nw-appearance-extension'
import { NwAppearanceProperties } from '../extensions/properties'

export function bakeAppearance() {
  return createTransform('bake-appearance', (doc: Document) => {

    for (const material of doc.getRoot().listMaterials()) {

      const props = material.getExtension<NwAppearanceProperties>(NwAppearanceExtension.EXTENSION_NAME)
      if (!props) {
        continue
      }
      const mapMask = props.getMaskTexture()
      if (!mapMask) {
        continue
      }

    }

  })
}

    // if (mapCustom?.File && mapDiffuse?.File && bake && appearance) {
    //   const key = `${getAppearanceId(appearance)}-${mapDiffuse.File}-${mapCustom.File}}`.toLowerCase()
    //   texDiffuse = await cache
    //     .addTexture(key, async () => {
    //       return {
    //         name: mapDiffuse.Map,
    //         mime: 'image/png',
    //         data: await blendDiffuseMap({
    //           base: mapDiffuse.File,
    //           mask: mapCustom.File,
    //           appearance: appearance,
    //         }),
    //       }
    //     })
    //     .catch((err) => {
    //       logger.error(`failed to blend diffuse map\n\t${mapDiffuse.File}\n\t${mapCustom.File}\n`, err)
    //       return null
    //     })
    // }
    // if (mapSpecular?.File && mapCustom?.File && bake && appearance) {
    //   const key = `${getAppearanceId(appearance)}-${mapSpecular.File}-${mapCustom.File}`.toLowerCase()
    //   texSpecular = await cache
    //     .addTexture(key, async () => {
    //       return {
    //         name: mapSpecular.Map,
    //         mime: 'image/png',
    //         data: await blendSpecularMap({
    //           base: mapSpecular?.File,
    //           mask: mapCustom.File,
    //           appearance: appearance,
    //         }),
    //       }
    //     })
    //     .catch((err) => {
    //       logger.error(`failed to blend specular map\n\t${mapSpecular.File}\n\t${mapCustom.File}\n`, err)
    //       return null
    //     })
    // }
    // if (appearance?.EmissiveColor) {
    //   // max value of EmissiveIntensity is 10
    //   logger.debug('EMISSIVE', appearance.EmissiveIntensity, appearance.EmissiveColor)
    //   const factor = (appearance.EmissiveIntensity || 0) / 10
    //   const color = hexToRgb(appearance.EmissiveColor, 1 / 255)
    //   material.setEmissiveFactor([color.r * factor, color.g * factor, color.b * factor])
    // }
