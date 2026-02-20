import { Logger } from "@nestjs/common";
import { RedisService } from "../persistence/RedisService";
import { RedisEventsGateway } from "../event/RedisEventGateway";

export class StatusCodeInterceptor {

    private readonly log = new Logger(StatusCodeInterceptor.name);
    private readonly redisService: RedisService;
    private readonly redisEventGateway: RedisEventsGateway;

    constructor(redisService: RedisService, redisEventGateway: RedisEventsGateway) {
        this.redisService = redisService;
        this.redisEventGateway = redisEventGateway;
    }

    async intercept(payload: any) {
        try {
            const res: any = await this.redisService.get(payload.responseId);
            const eventPayload: any = {
                fuzzerId: payload.fuzzerId,
                responseId: payload.responseId,
                scenarioName: payload.scenarioName,
                statusCode: res.statusCode,
                statusMessage: res.statusMessage
            };
            await this.redisEventGateway.runntimeEvent(payload.fuzzerId, 'status-code-runtime', eventPayload);
        } catch (e) {
            this.log.error(`[intercept] Error intercepting response: ${e.message}`, e);
            throw e;
        }
    }
}