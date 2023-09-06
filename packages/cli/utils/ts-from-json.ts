import {
  EnumType,
  getOptionValues,
  InputData,
  jsonInputForTargetLanguage,
  Name,
  quicktype,
  RenderContext,
  tsFlowOptions,
  TypeScriptRenderer,
  TypeScriptTargetLanguage,
} from 'quicktype-core'
import { utf16StringEscape } from 'quicktype-core/dist/support/Strings'

export class CustomTargetLanguage extends TypeScriptTargetLanguage {
  public constructor() {
    super()
  }
  protected makeRenderer(context: RenderContext, options: { [name: string]: any }): CustomTypeScriptRenderer {
    return new CustomTypeScriptRenderer(this, context, getOptionValues(tsFlowOptions, options))
  }
}

export class CustomTypeScriptRenderer extends TypeScriptRenderer {
  protected emitEnum(e: EnumType, enumName: Name): void {
    this.emitDescription(this.descriptionForType(e))
    this.emitLine(['export type ', enumName, ' = '])
    this.forEachEnumCase(e, 'none', (name, jsonName, position) => {
      const suffix = position === 'last' || position === 'only' ? ';' : ' | '
      this.indent(() => this.emitLine(`"${utf16StringEscape(jsonName)}"`, suffix))
    })
  }
}

export async function tsFromJson(typeName: string, samples: string[]) {
  const lang = new CustomTargetLanguage()
  const jsonInput = jsonInputForTargetLanguage(lang)
  await jsonInput.addSource({
    name: typeName,
    samples: samples,
  })

  const inputData = new InputData()
  inputData.addInput(jsonInput)

  return await quicktype({
    inputData,
    lang: lang,
    inferEnums: true,
    inferBooleanStrings: false,
    inferDateTimes: false,
    inferIntegerStrings: false,
    inferMaps: false,
    inferUuids: false,
    alphabetizeProperties: true,
    rendererOptions: {
      'just-types': true as any,
    },
  })
}
