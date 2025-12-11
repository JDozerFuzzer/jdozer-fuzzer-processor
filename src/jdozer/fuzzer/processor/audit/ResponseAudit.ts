import { Ajv, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { Logger } from "@nestjs/common";
import { Validator } from "./Validator";
import { ValidatorException } from "./ValidatorException";
import { Audit } from "./Audit";


export class ResponseAudit {

    private readonly log = new Logger(ResponseAudit.name);

    private responses: any;

    constructor(private readonly operation: any) {
        this.responses = this.setAuditor(operation);
    }

    public response(response: { statusCode: number, payload: any }): Audit {
        try {

            const audit: Audit = new Audit();
            const resp = this.findResponse(response.statusCode);
            if (!resp) {
                audit.statusCode = new Validator(false, [{ message: `The status code ${response.statusCode} is not defined` }]);
            } else {
                audit.payload = this.payload(response.payload, resp);
            }
            audit.statusCode = new Validator(true, []);
            return audit;

        } catch (e) {
            const errorMsg = `validate: The operation ${this.operation.name} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new ValidatorException({ message: errorMsg });
        }
    }

    private payload(responseBody: any, responseSchema: any): Validator {
        try {
            const payload = this.decodePayload(responseBody);
            if (responseSchema.schemaValidator && payload) {
                const isValid: boolean = responseSchema.schemaValidator(payload);
                return new Validator(isValid, responseSchema.schemaValidator.errors ? responseSchema.schemaValidator.errors : []);
            } else if (!payload && !responseSchema.schemaValidator) {
                return new Validator(true, undefined);
            } else if (payload && !responseSchema.schemaValidator) {
                return new Validator(false, [{ message: `There is no response schema defined for status code ${responseSchema.statusCode}` }]);
            }
        } catch (e) {
            const errorMsg = `validateSchema: The operation ${this.operation.name} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new ValidatorException({ message: errorMsg });
        }
    }

    private decodePayload(payload: string | undefined): any | undefined {
        try {
            if (payload) {
                const decode = Buffer.from(payload, 'base64').toString('utf-8');
                try {
                    return JSON.parse(decode);
                } catch (e) {
                    this.log.verbose(`getPayload: Response body is not a valid JSON, using raw string for validation`, e.message, decode);
                    return undefined;
                }
            }
        } catch (e) {
            const errorMsg = `getPayload: Response body is not a valid encode`;
            this.log.error(errorMsg, e.message, payload);
            throw new ValidatorException({ message: errorMsg });
        }
    }

    private findResponse(statusCode: number): { statusCode: string, schema: any, schemaValidator?: ValidateFunction } | undefined {
        let resp = this.responses.filter(res => res.statusCode === statusCode.toString());
        if (resp.length === 0) {
            resp = this.responses.filter(res => res.statusCode === 'default');
        }
        return resp.length > 0 ? resp[0] : undefined;
    }

    private setAuditor(operation): any {
        return operation.res.map((res) => {
            if (res.schema) {
                res.schemaValidator = this.getValidator().compile(res.schema);
            }
            return res;
        });
    }

    private getValidator(): Ajv {
        const ajv = new Ajv();
        ajv.addVocabulary(['example', 'xml']);
        addFormats(ajv);
        return ajv;
    }
}