import { Logger } from "@nestjs/common";
import { RedisService } from "./persistence/RedisService";
import { Fuzzer, SecurityFinding, Validation } from "./audit/Types";
import { OpenApiDetector } from "./audit/api/OpenApiDetector";
import { RedisEventsGateway } from "./event/RedisEventGateway";
import { XSSDetector } from "./audit/vectors/XSSDetector";
import { SecurityValidation } from "./audit/vectors/ReflectedXSSDetector";

export class JDozerFuzzerValidator {

    private readonly log = new Logger(JDozerFuzzerValidator.name);
    private readonly redisService: RedisService;
    private readonly runntimeEvent: RedisEventsGateway['runntimeEvent']

    constructor(redisService: RedisService, runntimeEvent: RedisEventsGateway['runntimeEvent']) {
        this.redisService = redisService;
        this.runntimeEvent = runntimeEvent;
    }

    public async validate(event: any): Promise<Validation[]> {
        try {

            const fuzzer: Fuzzer = await this.redisService.get(event.fuzzingId);

            const openApiDetector: OpenApiDetector = new OpenApiDetector(fuzzer, this.redisService);
            const validations: Validation[] = await openApiDetector.detect();

            const xssDetector: XSSDetector = new XSSDetector(fuzzer, this.redisService);
            const findings: SecurityValidation[] = await xssDetector.detectAux();

            const audit: any = {
                schemas: validations,
                vectors: findings
            };
            await this.redisService.set(`JDF:${fuzzer.fuzzerId}:AUD:${fuzzer.operationId}:${fuzzer.caseId}`, audit);

            await this.runntimeEvent(event.fuzzerId, 'validations', audit);
            return validations;

        } catch (e) {
            this.log.error(`Error validating fuzzer`, e);
            return [];
        }
    }
}