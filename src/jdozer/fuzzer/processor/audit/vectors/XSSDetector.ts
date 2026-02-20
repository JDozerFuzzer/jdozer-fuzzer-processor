import { Logger } from "@nestjs/common";
import { RedisService } from "../../persistence/RedisService";
import { BaseDetector } from "../BaseDetector";
import { Fuzzer, Mutation, SecurityFinding, SecurityValidation, Vector } from "../Types";
import { XSSException } from "./XSSException";
import { ReflectedXSSDetector } from "./ReflectedXSSDetector";


export class XSSDetector extends BaseDetector {

    private readonly log = new Logger(XSSDetector.name);
    private readonly redisService: RedisService;

    constructor(fuzzer: Fuzzer, redisService: RedisService) {
        super(fuzzer);
        this.redisService = redisService;
    }

    public async detectAux(): Promise<SecurityValidation[]> {
        const findings: SecurityValidation[] = [];

        const vector: Vector | undefined = await this.detectXSSPayload();
        if (vector) {
            const securityValidation: SecurityValidation | undefined = this.detectReflected(vector);
            if (securityValidation) {
                findings.push(securityValidation);
            } else {
                this.log.debug(`No reflected XSS detected in ${this.fuzzer.operationId}.`, this.fuzzer.id);
            }
        } else {
            this.log.debug(`No XSS payload detected in ${this.fuzzer.operationId}.`, this.fuzzer.id);
        }
        return findings;
    }

    private detectReflected(vector: Vector): SecurityValidation | undefined {

        try {

            const reflectedXSSDetector: ReflectedXSSDetector = new ReflectedXSSDetector();
            const securityValidation: SecurityValidation | null = reflectedXSSDetector.analyze(vector, this.fuzzer.response, this.fuzzer.request.url.toString(), this.fuzzer.request.method);
            if (securityValidation) {
                return securityValidation;
            }
            return undefined;

        } catch (e) {
            const err: string = `Error detecting reflected XSS: ${e.message}`;
            this.log.error(err, e);
            throw new XSSException(e);
        }
    }

    private async detectInjection(vector: Vector): Promise<SecurityFinding | null> {
        if (this.fuzzer.response.audit.statusCode.isValid) {
            const securityFinding: SecurityFinding = {
                id: `JDF:${this.fuzzer.fuzzerId}:AUD:${this.fuzzer.caseId}`,
                type: 'XSS_STORED',
                severity: 'HIGH',
                title: vector.description,
                category: vector.owasp_category,
                subCategory: vector.subcategory,
                context: vector.context,
                tags: vector.tags.split(","),
                technique: vector.technique,
                browserSpecific: vector.browser_specific,
                description: `The application is vulnerable to stored Cross-Site Scripting (XSS). The statusCode is ${this.fuzzer.response.statusCode} and send ${vector.description}.`,
                evidence: {
                    endpoint: `${this.fuzzer.request.url.pathname}`,
                    method: this.fuzzer.request.method,
                    requestId: this.fuzzer.response.uuidReq,
                    timestamp: Date.now(),
                    details: {
                        statusCode: this.fuzzer.response.statusCode,
                        statusMessage: this.fuzzer.response.statusMessage
                    },
                },
                recommendation: [
                    'Implement proper input validation and output encoding to prevent XSS attacks.',
                    'Use context-aware output encoding to ensure that user-supplied data is properly escaped for the specific context (HTML, JavaScript, CSS, etc.).',
                    'Implement a Content Security Policy (CSP) to mitigate the impact of XSS attacks.',
                    'Implement proper error handling to avoid leaking sensitive information.',
                ],
                confidence: 85,
                metadata: {
                    detector: 'XSSDetector',
                    patternId: 'XSS_ACCEPTED_PAYLOAD',
                    references: ['https://owasp.org/www-community/attacks/xss/'],
                }
            };

            await this.redisService.set(securityFinding.id, JSON.stringify(securityFinding));
            return securityFinding;
        }
        return null;
    }

    private async detectXSSPayload(): Promise<Vector | undefined> {
        const mutation: Mutation | undefined = this.getRequestPayload();
        if (mutation) {
            const vector: Vector = await this.redisService.get(`JDF:VEC:${mutation.vectorId}`);
            if (vector) {
                return vector;
            }

            this.log.error(`Vector not found: ID ${mutation.vectorId}`);
            throw new XSSException(`Vector not found: ID ${mutation.vectorId}`);
        }
        return undefined;
    }

    private getRequestPayload(): Mutation | undefined {
        return this.getPayloadVector();
    }



}