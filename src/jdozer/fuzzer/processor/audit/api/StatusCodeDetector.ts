import { BaseDetector } from "../BaseDetector";
import { Validation } from "../Types";
import { RedisService } from "../../persistence/RedisService";
import { type } from "os";


export class StatusCodeDetector {

    private readonly redisService: RedisService;
    private readonly operationResponses: any[];

    constructor(operationResponses: any[], redisService: RedisService) {
        this.operationResponses = operationResponses;
        this.redisService = redisService;
    }

    public async detect(statusCode: number): Promise<Validation> {
        return this.findStatusCode(statusCode);
    }

    private findStatusCode(statusCode: number): Validation {
        let resp = this.operationResponses.filter(res => res.statusCode === statusCode.toString());
        if (resp.length === 1) {
            return this.exactMatched(statusCode, resp[0]);
        }

        const wildcard = statusCode.toString().charAt(0).concat('XX');
        resp = this.operationResponses.filter(res => res.statusCode === wildcard);
        if (resp.length === 1) {
            return this.wildcardMatched(statusCode, resp[0]);
        }

        resp = this.operationResponses.filter(res => res.statusCode === 'default');
        if (resp.length === 1 && !this.is5xx(statusCode)) {
            return this.defaultMatched(statusCode, resp[0]);
        }

        if (this.is5xx(statusCode)) {
            return this.matched5xx(statusCode, resp[0]);
        }

        return this.notMatched(statusCode);
    }

    private exactMatched(statusCode: number, response: any): Validation {
        return {
            in: 'statusCode',
            type: 'STATUS_CODE_VALIDATION',
            severity: 'INFO',
            title: 'Status code matched',
            tags: ['status-code-validation'],
            messages: [
                ['status-code-matched', `The status code ${statusCode} is documented`]
            ],
            recommendation: ['Status code matched'],
            validation: {
                statusCode: statusCode,
                matchedStatusCode: response.statusCode,
                isValid: true
            }
        };
    }

    private wildcardMatched(statusCode: number, response: any): Validation {
        return {
            in: 'statusCode',
            type: 'STATUS_CODE_VALIDATION',
            severity: 'LOW',
            title: 'Status code matched in wildcard response',
            tags: ['status-code-validation', 'wildcard'],
            messages: [
                ['status-code-wildcard', `The status code ${statusCode} is documented as wildcard response ${response.statusCode}`]
            ],
            recommendation: ['Status code matched in wildcard response'],
            validation: {
                statusCode: statusCode,
                matchedStatusCode: response.statusCode,
                isValid: true
            }
        };
    }

    private defaultMatched(statusCode: number, response: any): Validation {
        return {
            in: 'statusCode',
            type: 'STATUS_CODE_VALIDATION',
            severity: 'MEDIUM',
            title: 'Status code matched in default response',
            tags: ['status-code-validation', 'default'],
            messages: [
                ['status-code-matched', `The status code ${statusCode} is documented as default response`]
            ],
            recommendation: ['Status code matched in default response'],
            validation: {
                statusCode: statusCode,
                matchedStatusCode: response.statusCode,
                isValid: true
            }
        };
    }

    private notMatched(statusCode: number): Validation {
        return {
            in: 'statusCode',
            type: 'STATUS_CODE_VALIDATION',
            severity: 'MEDIUM',
            title: 'Status code not matched',
            tags: ['status-code-validation', 'not-matched', 'contract-violation'],
            messages: [
                ['status-code-not-matched', `The status code ${statusCode} is not documented`],
                ['status-code-not-documented', `The status code ${statusCode} is not documented`],
                ['status-code-contract-violation', `Clients consuming the API will not be able to handle this response code. This can lead to unexpected behavior and errors.`]
            ],
            recommendation: ['Document this status code so that customers can process this type of response.'],
            validation: {
                statusCode: statusCode,
                matchedStatusCode: undefined,
                isValid: false
            }
        };
    }

    private matched5xx(statusCode: number, response: any): Validation {
        return {
            in: 'statusCode',
            type: 'STATUS_CODE_VALIDATION',
            severity: 'CRITICAL',
            title: 'Status code is 5xx',
            tags: ['status-code-validation', '5xx', 'server-error', 'unhandled-exception'],
            messages: [
                ['status-code-5xx', `The status code ${statusCode} is 5xx`],
                ['status-code-critical', `The status code ${statusCode} is critical`],
                ['status-code-server-error', `The API responded with a server error. This indicates a potential vulnerability or lack of error handling.`],
                ['status-code-security-risk', `The status code ${statusCode} is security risk`]
            ],
            recommendation: [
                `Verify that the application should actually return data for status code ${statusCode}`,
                `Review the application's error and exception handling`,
                `Ensure that sensitive information is not leaked in error responses`,
                `Implement proper logging and monitoring for server errors`,
                `Consider using a generic error response format`,
                `Implement proper error handling and recovery mechanisms`
            ],
            validation: {
                statusCode: statusCode,
                matchedStatusCode: 'N/A',
                isValid: false
            }
        };
    }

    private is5xx(statusCode: number): boolean {
        return statusCode.toString().startsWith('5');
    }


}