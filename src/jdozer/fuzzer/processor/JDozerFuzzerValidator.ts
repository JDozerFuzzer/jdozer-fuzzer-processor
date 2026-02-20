import { Logger } from "@nestjs/common";
import { RedisService } from "./persistence/RedisService";
import { Audit, Fuzzer, JDFAudit, SecurityValidation, Validation } from "./audit/Types";
import { OpenApiDetector } from "./audit/api/OpenApiDetector";
import { XSSDetector } from "./audit/vectors/XSSDetector";

export class JDozerFuzzerValidator {

    private readonly log = new Logger(JDozerFuzzerValidator.name);
    private readonly redisService: RedisService;

    constructor(redisService: RedisService) {
        this.redisService = redisService;
    }

    public async validate(event: any): Promise<string> {
        try {

            const fuzzer: Fuzzer = await this.redisService.get(event.fuzzingId);

            const openApiDetector: OpenApiDetector = new OpenApiDetector(fuzzer, this.redisService);
            const validations: Validation[] = await openApiDetector.detect();

            const xssDetector: XSSDetector = new XSSDetector(fuzzer, this.redisService);
            const findings: SecurityValidation[] = await xssDetector.detectAux();

            const id = `JDF:${fuzzer.fuzzerId}:AUD:${fuzzer.operationId}:${fuzzer.caseId}`;
            const audit: JDFAudit = {
                id: id,
                fuzzerId: fuzzer.fuzzerId,
                caseId: fuzzer.caseId,
                operationId: fuzzer.operationId,
                schemas: validations,
                vectors: findings
            };
            await this.redisService.set(id, audit);
            return id;

        } catch (e) {
            this.log.error(`Error validating fuzzer: ${event.fuzzingId}`, e);
            return undefined;
        }
    }
}