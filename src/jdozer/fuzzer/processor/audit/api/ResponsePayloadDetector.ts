import { ValidateFunction } from "ajv";
import { Fuzzer, Validation } from "../Types";
import { Logger } from "@nestjs/common";
import { OpenApiException } from "./OpenApiException";
import { RedisService } from "../../persistence/RedisService";
import { BaseDetector } from "../BaseDetector";

export class ResponsePayloadDetector extends BaseDetector {

    private readonly log = new Logger(ResponsePayloadDetector.name);
    private readonly redisService: RedisService;

    constructor(fuzzer: Fuzzer, redisService: RedisService) {
        super(fuzzer);
        this.redisService = redisService;
    }

    public async detect(operationResponse: any, statusCodeResult: Validation): Promise<Validation> {
        return await this.payloadValidator(operationResponse, statusCodeResult);
    }

    private async payloadValidator(operationResponse: any, statusCodeResult: Validation): Promise<Validation> {
        if (statusCodeResult.validation.isValid) {
            const responseSchema: any | undefined = operationResponse.schema;
            const payload: string | undefined = this.fuzzer.response.payload;
            if (!responseSchema && payload) {
                return this.schemaNotFound(statusCodeResult.validation.statusCode);
            } else if (responseSchema && !payload) {
                return this.responseBodyNotFound(statusCodeResult.validation.statusCode);
            } else if (responseSchema && payload) {
                const payloadDecoded = this.decodePayload(payload);
                try {
                    let payloadObj: any;
                    try {
                        payloadObj = JSON.parse(payloadDecoded);
                    } catch (e) {
                        this.log.warn(`[payloadValidator] Response body is not a valid JSON`, e.message, payloadDecoded, this.fuzzer.id);
                        return this.responseIsNotJson(statusCodeResult.validation.statusCode);
                    }
                    const validator: ValidateFunction = this.getValidator(responseSchema);
                    const isValid = validator(payloadObj);
                    if (!isValid) {
                        return this.schemaValidationFailed(statusCodeResult.validation.statusCode, validator.errors);
                    } else if (isValid) {
                        return this.schemaValidationPassed(statusCodeResult.validation.statusCode);
                    }
                } catch (e) {
                    this.log.error(`[payloadValidator] Error evaluate response payload`, e.message, payloadDecoded, this.fuzzer.id);
                    // Created specific validation error
                    return this.responseIsNotJson(statusCodeResult.validation.statusCode);
                }
            } else if (!responseSchema && !payload) {
                return this.schemaValidationEmpty(statusCodeResult.validation.statusCode);
            }
        }
    }

    private schemaNotFound(statusCode: string): Validation {
        return {
            in: 'payload',
            type: 'RESPONSE_PAYLOAD_SCHEMA_VALIDATION',
            severity: 'LOW',
            title: 'Response schema not found',
            tags: ['missing-schema'],
            messages: [
                ['response-schema-not-found', `The response schema is not defined for status code ${statusCode}`],
                ['response-body-not-empty', `The response body is not empty for status code ${statusCode}`],
                ['contract-violation', `The response violates the contract for status code ${statusCode}`]
            ],
            recommendation: [
                `Add a response schema for status code ${statusCode}`,
                `Verify that the application should actually return data for status code ${statusCode}`,
                `If the response scheme is not defined, clients may ignore the response body.`
            ],
            validation: {
                in: 'payload',
                isValid: false
            }
        }
    }

    private responseBodyNotFound(statusCode: string): Validation {
        return {
            in: 'payload',
            type: 'RESPONSE_PAYLOAD_SCHEMA_VALIDATION',
            severity: 'MEDIUM',
            title: 'Response body not found',
            tags: ['missing-response-body'],
            messages: [
                ['response-body-not-found', `The response payload is empty for status code ${statusCode}.`],
                ['contract-violation', `The response violates the contract for status code ${statusCode}`]
            ],
            recommendation: [
                `Add a response payload for status code ${statusCode}`,
                `Verify that the application should actually return data for status code ${statusCode}`,
                `If the response scheme is not defined, clients may ignore the response body.`
            ],
            validation: {
                in: 'payload',
                isValid: false
            }
        };
    }

    private schemaValidationFailed(statusCode: string, errors: any[]): Validation {
        return {
            in: 'payload',
            type: 'RESPONSE_PAYLOAD_SCHEMA_VALIDATION',
            severity: 'HIGH',
            title: 'Response schema validation failed',
            tags: ['schema-validation', 'contract-violation'],
            messages: [
                ['response-is-not-valid', `The response is not valid according to the schema for status code ${statusCode}`],
                ['contract-violation', `The response violates the contract for status code ${statusCode}`],
                ['response-schema-validation-details', JSON.stringify(errors)]
            ],
            recommendation: [
                `Add a response schema for status code ${statusCode}`,
                `Verify that the application should actually return data for status code ${statusCode}`,
                `If the response scheme is not defined, clients may ignore the response body.`
            ],
            validation: {
                in: 'payload',
                isValid: false
            }
        };
    }

    private schemaValidationEmpty(statusCode: string): Validation {
        return {
            in: 'payload',
            type: 'RESPONSE_PAYLOAD_SCHEMA_VALIDATION',
            severity: 'INFO',
            title: 'Response schema validation empty',
            tags: ['schema-validation', 'contract-validation', 'empty-response-body', 'empty-response-schema'],
            messages: [
                ['response-is-valid', `There is no response and no scheme to validate for status code ${statusCode}.`],
                ['contract-validation', `The response validates the contract for status code ${statusCode}`]
            ],
            recommendation: [
                `No action needed.`
            ],
            validation: {
                in: 'payload',
                isValid: true
            }
        };
    }

    private schemaValidationPassed(statusCode: string): Validation {
        return {
            in: 'payload',
            type: 'RESPONSE_PAYLOAD_SCHEMA_VALIDATION',
            severity: 'INFO',
            title: 'Response schema validation passed',
            tags: ['schema-validation'],
            messages: [
                ['response-is-valid', `The response is valid according to the schema for status code ${statusCode}`]
            ],
            recommendation: [
                `The response schema is valid.`
            ],
            validation: {
                in: 'payload',
                isValid: true
            }
        };
    }

    private responseIsNotJson(statusCode: string): Validation {
        return {
            in: 'payload',
            type: 'RESPONSE_PAYLOAD_SCHEMA_VALIDATION',
            severity: 'HIGH',
            title: 'Response is not JSON',
            tags: ['schema-validation', 'contract-violation', 'invalid-json'],
            messages: [
                ['response-is-not-json', `The response is not a valid JSON for status code ${statusCode}`],
                ['contract-violation', `The response violates the contract for status code ${statusCode}`]
            ],
            recommendation: [
                `Add a response schema for status code ${statusCode}`,
                `Verify that the application should actually return data for status code ${statusCode}`,
                `If the response scheme is not defined, clients may ignore the response body.`
            ],
            validation: {
                in: 'payload',
                isValid: false
            }
        };
    }

    private decodePayload(payload: string | undefined): string {
        try {
            return Buffer.from(payload, 'base64').toString('utf-8');
        } catch (e) {
            const errorMsg = `getPayload: Response body is not a valid encode base64`;
            this.log.error(errorMsg, e.message, payload);
            throw new OpenApiException(errorMsg);
        }
    }

}

