import { Logger } from "@nestjs/common";
import { RedisService } from "../persistence/RedisService";
import { RedisEventsGateway } from "../event/RedisEventGateway";
import { ResponseAuditor } from "../audit/ResponseAuditor";

export class ResponseInterceptor {


    private readonly log: Logger = new Logger(ResponseInterceptor.name);
    private readonly responseAuditor: ResponseAuditor;

    constructor(
        private readonly redisService: RedisService,
        private readonly runntimeEvent: RedisEventsGateway["runntimeEvent"]
    ) {
        this.responseAuditor = new ResponseAuditor(this.redisService);
    }

    public async intercept(responseEvent: any) {
        try {

            const fuzzing: any = await this.responseAuditor.merge(
                responseEvent.responseId.replace('RES', 'REQ'),
                responseEvent.responseId,
                responseEvent.operationId,
                responseEvent.fuzzerId
            );

            await this.runntimeEvent(fuzzing.fuzzerId, 'req-res-merged', {
                fuzzerId: fuzzing.fuzzerId,
                caseId: fuzzing.caseId,
                fuzzingId: fuzzing.id,
                operationId: fuzzing.operationId,
                isValid: fuzzing.request.mutations.isValid,
                statusCode: fuzzing.response.statusCode
            });

        } catch (e) {
            this.log.error(`[intercept] Error intercepting response: ${e.message}`, e);
        }
    }

}

