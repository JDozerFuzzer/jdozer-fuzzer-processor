import { Inject, Injectable, Logger } from "@nestjs/common";
import { Key } from "readline";
import { KeyManager } from "./KeyManager";
import { UUID } from "crypto";
import { StorageException } from "./StorageException";
import { RedisService } from "./RedisService";


@Injectable()
export class Storage {

    private readonly log = new Logger(Storage.name);

    @Inject()
    private readonly redisService: RedisService;
    private readonly keyManager: KeyManager = new KeyManager();

    constructor() {
        this.log.verbose(`Storage initialized!`);
    }

    public async getFuzzer(id: UUID): Promise<any> {
        try {
            const fuzzer = await this.redisService.get(this.keyManager.forFuzzer(id));
            if (!fuzzer) {
                throw new StorageException({ message: `Fuzzer ${id} not found` });
            }
            return fuzzer;
        } catch (e) {
            const errorMsg = `get: Error retrieving key ${id}: ${e.message}`;
            this.log.error(errorMsg);
            throw new StorageException({ message: errorMsg });
        }
    }

    public async getMutation(id: UUID, context: string, operation: string, fuzzerId: UUID): Promise<any> {
        try {
            let mutation = await this.redisService.get(this.keyManager.forFake(fuzzerId, operation, context, id));
            if (!mutation) {
                throw new StorageException({ message: `Mutation ${id} not found` });
            }
            return mutation;
        } catch (e) {
            const errorMsg = `getMutation: The mutation ${id} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new StorageException({ message: errorMsg });
        }
    }

    public async getOperation(opeartionName: string, fuzzerId: UUID): Promise<any> {
        try {
            let operation = await this.redisService.get(this.keyManager.forOperation(opeartionName, fuzzerId));
            if (!operation) {
                throw new StorageException({ message: `Operation ${opeartionName} not found` });
            }
            return operation;
        } catch (e) {
            const errorMsg = `getOperation: The operation ${opeartionName} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new StorageException({ message: errorMsg });
        }
    }

    public async getRequestIds(operation: string, fuzzerId: UUID): Promise<any> {
        try {
            let requestIds = await this.redisService.getKeys(this.keyManager.forReqKeysByOperation(fuzzerId, operation));
            if (!requestIds) {
                throw new StorageException({ message: `Request IDs for ${operation} not found` });
            }
            return requestIds;
        } catch (e) {
            const errorMsg = `getRequestIds: The request IDs for ${operation} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new StorageException({ message: errorMsg });
        }
    }

    public async getRequestById(id: string): Promise<any> {
        try {
            let request = await this.redisService.get(id);
            if (!request) {
                throw new StorageException({ message: `Request ${id} not found` });
            }
            return request;
        } catch (e) {
            const errorMsg = `getRequestById: The request ${id} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new StorageException({ message: errorMsg });
        }

    }

    public async getRequest(id: UUID, operation: string, fuzzerId: UUID): Promise<any> {
        try {
            let request = await this.redisService.get(this.keyManager.forReq(fuzzerId, operation, id));
            if (!request) {
                throw new StorageException({ message: `Request ${id} not found` });
            }
            return request;
        } catch (e) {
            const errorMsg = `getRequest: The request ${id} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new StorageException({ message: errorMsg });
        }
    }

    public async getResponseByRequestId(requestId: string): Promise<any> {
        try {
            let response = await this.redisService.get(requestId.replace(':REQ', ':RES'));
            if (!response) {
                throw new StorageException({ message: `Response for request ${requestId} not found` });
            }
            return response;
        } catch (e) {
            const errorMsg = `getResponseByRequestId: The response for request ${requestId} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new StorageException({ message: errorMsg });
        }
    }

    public async getResponse(id: UUID, operation: string, fuzzerId: UUID): Promise<any> {
        try {
            let response = await this.redisService.get(this.keyManager.forRes(fuzzerId, operation, id));
            if (!response) {
                throw new StorageException({ message: `Response ${id} not found` });
            }
            return response;
        } catch (e) {
            const errorMsg = `getResponse: The response ${id} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new StorageException({ message: errorMsg });
        }
    }

    public async saveFuzz(fuzzerId: UUID, requestId: UUID, fuzz: any): Promise<void> {
        try {
            await this.redisService.set(this.keyManager.forFuzz(fuzzerId, requestId), fuzz);
        } catch (e) {
            const errorMsg = `saveAggregate: The aggregate for request ${requestId} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new StorageException({ message: errorMsg });
        }
    }
}