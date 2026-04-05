// Stub declarations for optional peer dependencies of react-native-executorch.
// These modules are only used by LLM/vision features we don't use — we only
// use TextEmbeddingsModule. The stubs prevent tsc errors without installing
// the actual packages.

declare module 'react-native-fs' {
  const RNFS: any
  export default RNFS
  export const DocumentDirectoryPath: string
  export const CachesDirectoryPath: string
}

declare module '@huggingface/jinja' {
  export class Template {
    constructor(template: string)
    render(context: Record<string, any>): string
  }
}

declare module 'zod/v4' {
  export function parse(schema: any, data: any, ...rest: any[]): any
  export function toJSONSchema(schema: any): any
  const z: any
  export default z
}

declare module 'zod/v4/core' {
  export class $ZodType {}
  export type output<T> = any
  export namespace JSONSchema {
    type JSONSchema = any
  }
}

declare module 'jsonschema' {
  export class Validator {
    validate(instance: any, schema: any, options?: any): any
  }
  export interface Schema {}
}

declare module 'jsonrepair' {
  export function jsonrepair(json: string): string
}
