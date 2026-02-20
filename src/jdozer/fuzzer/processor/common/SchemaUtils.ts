import * as traverse from "json-schema-traverse";
import Ajv, { ValidateFunction } from "ajv";
import AjvDraft04 from "ajv-draft-04";
import addFormats, { FormatName } from "ajv-formats";
import { Logger } from "@nestjs/common";

export class SchemaUtils {

    private readonly log: Logger = new Logger(SchemaUtils.name);

    private readonly MODERN_SCHEMA_VERSION = 'modern';
    private readonly DRAFT_04_SCHEMA_VERSION = 'draft-04';
    private ajv: Ajv;

    /**
     * Transforma un schema JSON para aplicar additionalProperties: false
     * en TODOS los objetos, respetando additionalProperties: true explícito.
     * Maneja allOf, anyOf, oneOf, not, if/then/else, items, dependencies, etc.
     */
    public enforceStrictProperties(schema: JsonSchema): any {

        let newSchema: JsonSchema;
        try {
            // Clonar profundamente para no mutar el original
            newSchema = JSON.parse(JSON.stringify(schema)) as JsonSchema;
        } catch (e) {
            const err: string = `Error cloning the schema: ${e.message}`;
            this.log.error(err, e.stack);
            throw new Error(err);
        }

        // Recorrer todo el schema con json-schema-traverse
        traverse(newSchema, (node: any) => {
            // Solo procesar objetos
            if (!node || typeof node !== 'object') return;

            // Aplicar a objetos JSON Schema
            if (node.type === 'object') {
                // Si no tiene additionalProperties definido o es undefined
                if (node.additionalProperties === undefined) {
                    // Aplicar false por defecto (estricto)
                    node.additionalProperties = false;
                }
                // Si ya tiene additionalProperties (true/false/objeto), lo respetamos
            }

            // Caso especial: si no tiene type pero tiene properties/patternProperties,
            // asumimos que es un objeto implícito
            if (!node.type && (node.properties || node.patternProperties)) {
                if (node.additionalProperties === undefined) {
                    node.additionalProperties = false;
                }
            }

            // Nota: json-schema-traverse ya maneja automáticamente:
            // - allOf, anyOf, oneOf, not
            // - if, then, else
            // - items, additionalItems
            // - dependencies
            // - patternProperties
            // - propertyNames
            // - contains
            // No necesitamos recursión manual
        });
        return newSchema;
    }

    public getValidator(schema: any): Ajv {
        const ajvConf = {
            allErrors: true,
            verbose: true,
            strict: true
        };
        switch (this.detectSchemaVersion(schema)) {
            case this.DRAFT_04_SCHEMA_VERSION:
                this.ajv = new AjvDraft04(ajvConf);
                break;
            case this.MODERN_SCHEMA_VERSION:
                this.ajv = new Ajv(ajvConf);
                break;
            default:
                this.ajv = new Ajv(ajvConf);
                break;
        }

        this.ajv.addVocabulary(['example', 'xml']);
        addFormats(this.ajv, {
            mode: 'full',
            formats: (this.formats as FormatName[])
        });

        // Agregar keyword personalizada para validar int64
        this.addInt64Keyword();

        return this.ajv;
    }

    private detectSchemaVersion(schema: any): string {
        if (schema.$schema) {
            if (schema.$schema.includes(this.DRAFT_04_SCHEMA_VERSION)) {
                return this.DRAFT_04_SCHEMA_VERSION;
            }
        } else {
            if (schema.id && !schema.$id) {
                return this.DRAFT_04_SCHEMA_VERSION;
            }
        }
        return this.MODERN_SCHEMA_VERSION;
    }


    private addInt64Keyword() {
        this.ajv.addKeyword({
            keyword: 'int64',
            type: 'integer',
            schemaType: 'boolean',
            compile: () => (data: any) => {
                // Convertir a string si es necesario
                const str = String(data);
                try {
                    // Usar BigInt para comparación exacta
                    const value = BigInt(str);
                    return true;
                } catch {
                    return false;
                }
            },
            errors: false
        });

        /**
        // Keyword para validación exacta con maximum/minimum
        this.ajv.addKeyword({
            keyword: 'maximum',
            type: 'integer',
            schemaType: 'number',
            compile: (max: number) => (data: any) => {
                const value = BigInt(data);
                const maxBigInt = BigInt(max);
                return value <= maxBigInt;
            },
            errors: false
        });

        this.ajv.addKeyword({
            keyword: 'minimum',
            type: 'integer',
            schemaType: 'number',
            compile: (min: number) => (data: any) => {
                const value = BigInt(data);
                const minBigInt = BigInt(min);
                return value >= minBigInt;
            },
            errors: false
        });
         */
    }

    // Método de validación que maneja números grandes
    validate(schema: any, data: any): { valid: boolean; errors?: any[] } {
        // Si el valor es muy grande, convertirlo a string para preservarlo
        if (typeof data === 'number' && data > Number.MAX_SAFE_INTEGER) {
            data = data.toString();
        }

        try {
            const validate = this.ajv.compile(schema);
            const valid = validate(data);
            return { valid, errors: validate.errors };
        } catch (error) {
            return { valid: false, errors: [{ message: error.message }] };
        }
    }

    private readonly formats = [
        "int32", "int64", "float", "double",
        "byte", "binary",
        "date", "time", "date-time",
        "email", "hostname", "ipv4", "ipv6",
        "uri", "uuid", "uri-reference"
    ];

}

interface JsonSchema {
    type?: string;
    properties?: Record<string, JsonSchema>;
    patternProperties?: Record<string, JsonSchema>;
    additionalProperties?: boolean | JsonSchema;
    items?: JsonSchema | JsonSchema[];
    allOf?: JsonSchema[];
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    not?: JsonSchema;
    if?: JsonSchema;
    then?: JsonSchema;
    else?: JsonSchema;
    dependencies?: Record<string, JsonSchema | string[]>;
    patternRequired?: string[];
    [key: string]: any;
}

