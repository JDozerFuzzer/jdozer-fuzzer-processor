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
                this.log.warn(`getRequestIds: No request IDs found for operation ${operation}`);
                return [];
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
                this.log.warn(`getResponseByRequestId: No response found for request ${requestId}`);
                return undefined;
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

    public async saveFuzz(fuzzerId: UUID, requestId: UUID, operationId: string, statusCode: number, fuzz: any): Promise<void> {
        try {
            await this.redisService.set(this.keyManager.forFuzz(fuzzerId, requestId, operationId, statusCode), fuzz);
        } catch (e) {
            const errorMsg = `saveAggregate: The aggregate for request ${requestId} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new StorageException({ message: errorMsg });
        }
    }

    public async getContract(fuzzerId: UUID): Promise<any> {
        try {
            const contract = await this.redisService.getNative(this.keyManager.forApi(fuzzerId));
            if (!contract) {
                throw new StorageException({ message: `Contract for fuzzer ${fuzzerId} not found` });
            }
            return JSON.parse(Buffer.from(contract, 'base64').toString('utf-8'));
        } catch (e) {
            const errorMsg = `getContract: The contract for fuzzer ${fuzzerId} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new StorageException({ message: errorMsg });
        }
    }

    public async getVector(vectorId: number): Promise<any> {
        try {
            return await this.redisService.get(`JDF:VEC:${vectorId}`);
        } catch (e) {
            const errorMsg = `getVector: The vector ${vectorId} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new StorageException({ message: errorMsg });
        }
    }

    public async getVectorCount(fuzzerId: UUID): Promise<string> {
        try {
            return await this.redisService.getNative(this.keyManager.forFuzzer(fuzzerId).concat(':VEC:COUNT'));
        } catch (e) {
            const errorMsg = `getVectorCount: The vector count contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new StorageException({ message: errorMsg });
        }
    }

    public async saveVectorCount(fuzzerId: UUID, vectorCount: any): Promise<void> {
        try {
            await this.redisService.set(this.keyManager.forFuzzer(fuzzerId).concat(':VEC:COUNT'), vectorCount);
        } catch (e) {
            const errorMsg = `saveVectorCount: The vector count contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new StorageException({ message: errorMsg });
        }
    }

    public async save(key: string, value: any): Promise<void> {
        try {
            await this.redisService.set(key, value);
        } catch (e) {
            const err = `Error trying to save data.`;
            this.log.error(err, e.message);
            throw e;
        }
    }

    public async saveMutationCount(fuzzerId: UUID, mutationCount: any): Promise<void> {
        try {
            await this.redisService.set(this.keyManager.forFuzzer(fuzzerId).concat(':MUT:COUNT'), mutationCount);
        } catch (e) {
            const errorMsg = `saveMutationCount: The mutation count contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new StorageException({ message: errorMsg });
        }
    }

    public getRedisService(): RedisService {
        return this.redisService;
    }
}