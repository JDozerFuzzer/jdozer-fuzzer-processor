import { Logger } from "@nestjs/common";
import { KeyManager } from "./persistence/KeyManager";
import { UUID } from "crypto";
import { ProcessorException } from "./ProcessorException";

export class JDozerFuzzer {

    private readonly log = new Logger(JDozerFuzzer.name);
    private readonly keyManager: KeyManager = new KeyManager();

    constructor(
        private readonly fuzzerId: UUID,
        private readonly redisService: any
    ) {
        this.log.debug(`JDozerFuzzer initialized with fuzzerId: ${fuzzerId}`);
    }

    public async get(): Promise<any> {
        try {
            return await this.redisService.get(this.keyManager.forFuzzer(this.fuzzerId));
        } catch (e) {
            const errorMsg = `process: The fuzzer ${this.fuzzerId} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new ProcessorException({ message: errorMsg });
        }
    }

}