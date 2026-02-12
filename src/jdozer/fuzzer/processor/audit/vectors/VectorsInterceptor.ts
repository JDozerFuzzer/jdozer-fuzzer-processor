import { Logger } from "@nestjs/common";
import { RedisService } from "../../persistence/RedisService";


export class VectorsInterceptor {

    private readonly log = new Logger(VectorsInterceptor.name);
    private readonly redisService: RedisService;

    constructor(redisService: RedisService) {
        this.redisService = redisService;
    }

    private fuzzByStatusCodeAudit = class FuzzByStatusCodeAudit {
        public level: { LOW: 1 } | { MEDIUM: 2 } | { HIGH: 3 };
        public inTo: "payload" | "headers" | "path" | "query";
        public description: string;

    };

    public async fuzzByStatusCode(fuzzingCase: any): Promise<any> {
        try {
            const fuzzing = await this.redisService.get(fuzzingCase.fuzzingId);
            const scriptIn = new this.fuzzByStatusCodeAudit();
            if (fuzzing.request.mutations.isValid === false) {
                if (fuzzing.response.statusCode >= 200 || fuzzing.response.statusCode <= 299) {
                    scriptIn.level = { HIGH: 3 };
                } else if (fuzzing.response.statusCode >= 500 || fuzzing.response.statusCode <= 599) {
                    scriptIn.level = { MEDIUM: 2 };
                } else {
                    scriptIn.level = { LOW: 1 };
                }
                scriptIn.inTo = this.getProperty(fuzzing.request.mutations);
                scriptIn.description = await this.getDescription(fuzzing.request.mutations[scriptIn.inTo]);

                if (!fuzzing.audit) {
                    fuzzing.audit = {};
                }

                fuzzing.audit.fuzzByStatusCode = scriptIn;
                await this.redisService.set(fuzzingCase.fuzzingId, fuzzing);

                return scriptIn;
            }
        } catch (e) {
            const err = `An error occurred while trying to inject script.`;
            this.log.error(err, e.message);
            throw new Error(err);
        }
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