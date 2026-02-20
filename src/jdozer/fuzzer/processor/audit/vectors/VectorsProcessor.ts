import { Logger } from "@nestjs/common";
import { UUID } from "crypto";
import { Storage } from "../../persistence/Storage";
import { VectorCount } from "./VectorCount";
import { RedisService } from "../../persistence/RedisService";

export class VectorsProcessor {

    private readonly log: Logger = new Logger(VectorsProcessor.name);
    private readonly fuzzerId: UUID;

    private readonly redisService: RedisService;
    private readonly storage: Storage;
    private readonly vectorCounts: VectorCount[] = [];

    constructor(fuzzerId: UUID, storage: Storage) {
        this.fuzzerId = fuzzerId;
        this.storage = storage;
        this.redisService = storage.getRedisService();
    }

    public async add(requestFuzz: any) {
        try {
            const keys: string[] = Object.keys(requestFuzz.request.mutations);
            for (const key of keys) {
                if (requestFuzz.request.mutations[key].vectorId) {
                    this.updateVectorCount(requestFuzz.request.operationId, requestFuzz.request.mutations[key].vectorId, requestFuzz.request.uuid);
                }
            }
        } catch (e) {
            const err = `An error occurred while trying to count vectors.`;
            this.log.error(err, e.message);
            throw new Error(err);
        }
    }

    public async save() {
        try {
            await this.saveVectorCount(this.vectorCounts);
        } catch (e) {
            const err = `An error occurred while trying to save vector count.`;
            this.log.error(err, e.message);
            throw new Error(err);
        }
    }

    private updateVectorCount(operationId: string, vectorId: number, requestId: UUID): number {
        try {

            let index = this.getIndex(operationId);
            if (index === -1) {
                const vectorCount: VectorCount = new VectorCount(operationId);
                vectorCount.addVector(vectorId);
                index = this.vectorCounts.push(vectorCount) - 1;
            }

            if (!this.vectorCounts[index].getVector(vectorId))
                this.vectorCounts[index].addVector(vectorId);

            this.vectorCounts[index].addRequest(vectorId, requestId);
            return index;

        } catch (e) {
            const err = `An error occurred while trying to update vector count.`;
            this.log.error(err, e.message);
            throw new Error(err);
        }
    }

    private getIndex(operationId: string): number {
        return this.vectorCounts.findIndex((vc) => vc.getOperationId() === operationId);
    }

    private async saveVectorCount(vectorCount: any) {
        try {
            await this.storage.saveVectorCount(this.fuzzerId, vectorCount);
        } catch (e) {
            const err = `An error occurred while trying to save vector count.`;
            this.log.error(err, e.message);
            throw new Error(err);
        }
    }

}   