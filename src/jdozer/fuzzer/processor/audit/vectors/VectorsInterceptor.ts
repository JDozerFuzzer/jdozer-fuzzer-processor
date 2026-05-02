import { Logger } from "@nestjs/common";
import { RedisService } from "../../persistence/RedisService";


export class VectorsInterceptor {

    private readonly log = new Logger(VectorsInterceptor.name);
    private readonly redisService: RedisService;

    constructor(redisService: RedisService) {
        this.redisService = redisService;
    }

    private fuzzByStatusCodeAudit = class FuzzByStatusCodeAudit {
        public level: 0 | 1 | 2 | 3;
        public property: "payload" | "headers" | "path" | "query";
        public description: string;
        public statusCode: number;

    };

    public async falsePositiveLevel(fuzzingCase: any): Promise<any> {
        try {
            const fuzzing = await this.redisService.get(fuzzingCase.fuzzingId);
            const scriptIn = new this.fuzzByStatusCodeAudit();
            if (fuzzing.request.mutations.isValid === false) {
                scriptIn.statusCode = fuzzing.response.statusCode;
                scriptIn.level = this.determineRiskLevel(scriptIn.statusCode);
                scriptIn.property = this.getProperty(fuzzing.request.mutations);
                scriptIn.description = await this.getDescription(fuzzing.request.mutations[scriptIn.property]);

                if (!fuzzing.audit) {
                    fuzzing.audit = {};
                }

                fuzzing.audit.fuzzByLevel = scriptIn;
                await this.redisService.set(fuzzingCase.fuzzingId, fuzzing);

                return {
                    fuzzerId: fuzzing.fuzzerId,
                    fuzzingId: fuzzing.id,
                    operationId: fuzzing.operationId,
                    riskLevel: scriptIn.level,
                    context: scriptIn.property,
                    details: scriptIn.description,
                    statusCode: scriptIn.statusCode
                }
            }
        } catch (e) {
            const err = `An error occurred while trying to inject script.`;
            this.log.error(err, e.message);
            throw new Error(err);
        }
    }

    private determineRiskLevel(statusCode: number): 0 | 1 | 2 | 3 {
        if (statusCode >= 200 && statusCode <= 299) return 3;
        if (statusCode >= 500 && statusCode <= 599) return 2;
        if (statusCode >= 400 && statusCode <= 499) return 1;
        return 0;
    }

    private async getDescription(mutation: any): Promise<string> {
        try {
            const vector = await this.findVector(mutation);
            if (vector) {
                return `Vector ${vector.context}, ${vector.description}, in property ${mutation.property}`;
            } else {
                if (!mutation.valid) {
                    return `Fake value ${mutation.message}, in property ${mutation.property}`;
                }
            }
            return "No mutation found";
        } catch (e) {
            const err = `An error occurred while trying to get description.`;
            this.log.error(err, e.message);
            throw new Error(err);
        }
    }

    private getProperty(mutations: any): any {
        const keys: string[] = Object.keys(mutations);
        for (const key of keys) {
            if (!mutations[key].valid) {
                return key;
            }
        }
        return undefined;
    }

    private async findVector(mutation: any): Promise<any> {
        if (mutation.vectorId) {
            return await this.redisService.get(`JDF:VEC:${mutation.vectorId}`);
        }
    }


}