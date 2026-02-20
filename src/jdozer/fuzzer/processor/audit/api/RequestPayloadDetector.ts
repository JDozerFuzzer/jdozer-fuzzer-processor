import { Logger } from "@nestjs/common";
import { RedisService } from "../../persistence/RedisService";
import { Fuzzer, SecurityFinding, Validation } from "../Types";
import { BaseDetector } from "../BaseDetector";
import { ValidateFunction } from "ajv";
import { OpenApiException } from "./OpenApiException";


export class RequestPayloadDetector extends BaseDetector {

    private readonly log = new Logger(RequestPayloadDetector.name);
    private readonly redisService: RedisService;

    constructor(fuzzer: Fuzzer, redisService: RedisService) {
        super(fuzzer);
        this.redisService = redisService;
    }

    async detect(): Promise<SecurityFinding[]> {
        return [];
    }

    public async detectAux(operationRequest: any): Promise<Validation> {
        const schema = this.getSchema(operationRequest);
        const payloadStr: string | undefined = this.getPayload();
        let payload: any;
        let validation: Validation;

        if (!schema && !payloadStr) {
            validation = this.schemaValidationEmpty();
        } else if (schema && payloadStr) {
            try {
                payload = JSON.parse(payloadStr);
            } catch (e) {
                const errorMsg = `detectAux: Error to parse payload`;
                this.log.error(errorMsg, e, payloadStr);
                throw new OpenApiException(errorMsg);
            }
            const validator: ValidateFunction = this.getValidator(schema);
            const isValid = validator(payload);
            if (!isValid) {
                validation = this.schemaValidationFailed(validator.errors);
            } else if (isValid) {
                validation = this.schemaValidationPassed();
            }

            validation.validation.original = this.fuzzer.request.mutations;

        }
        return validation;
    }

    private schemaValidationEmpty(): Validation {
        return {
            in: 'payload',
            type: 'REQUEST_PAYLOAD_SCHEMA_VALIDATION',
            severity: 'INFO',
            title: 'Empty request payload and schema',
            tags: ['schema-validation', 'contract-validation', 'empty-request-body', 'empty-request-schema'],
            messages: [
                ['request-is-empty', `The request payload is empty`],
                ['request-schema-is-empty', `The request schema is empty`]
            ],
            recommendation: [],
            validation: {
                in: 'payload',
                isValid: true
            }
        };
    }

    private schemaValidationFailed(errors: any[]): Validation {
        return {
            in: 'payload',
            type: 'REQUEST_PAYLOAD_SCHEMA_VALIDATION',
            severity: 'HIGH',
            title: 'Request schema is invalid',
            tags: ['schema-validation', 'contract-violation', 'request-payload-schema', 'request-payload-mutation'],
            messages: [
                ['request-is-not-valid', `The request payload is not valid according to the contract`],
                ['contract-violation', `The request payload violates the contract`],
                ['request-schema-validation-details', JSON.stringify(errors)]
            ],
            recommendation: [],
            validation: {
                in: 'payload',
                isValid: false
            }
        };
    }

    private schemaValidationPassed(): Validation {
        return {
            in: 'payload',
            type: 'REQUEST_PAYLOAD_SCHEMA_VALIDATION',
            severity: 'INFO',
            title: 'Request schema validation passed',
            tags: ['payload', 'schema-validation', 'contract-validation'],
            messages: [
                ['request-is-valid', `The request payload is valid according to the schema`],
            ],
            recommendation: [

            ],
            validation: {
                in: 'payload',
                isValid: true
            }
        };
    }

    private getSchema(operationRequest: any): any | undefined {
        return operationRequest.payload
    }

    private getPayload(): string | undefined {
        if (this.fuzzer.request.payload) {
            return this.decodeBase64(this.fuzzer.request.payload);
        }
        return undefined;
    }

}