import { Logger } from "@nestjs/common";
import { UUID } from "crypto";
import { Storage } from "../../persistence/Storage";
import { MutationsCount } from "./MutationsCount";


export class MutationsProcessor {

    private readonly log: Logger = new Logger(MutationsProcessor.name);
    private readonly fuzzerId: UUID;

    private readonly storage: Storage;
    private readonly mutations: MutationsCount[] = [];

    constructor(fuzzerId: UUID, storage: Storage) {
        this.fuzzerId = fuzzerId;
        this.storage = storage;
    }

    public async add(requestFuzz: any) {
        try {

            if (requestFuzz.mutations.isValid)
                return;

            const paramsKeys: string[] = Object.keys(requestFuzz.request.params);
            for (const paramKey of paramsKeys) {
                this.updateMutationCount(requestFuzz.request.operationId, requestFuzz.request.params[paramKey].mutationId, requestFuzz.request.uuid);
            }
        } catch (e) {
            const err = `An error occurred while trying to count mutations.`;
            this.log.error(err, e.message);
            throw new Error(err);
        }
    }

    public async save() {
        try {
            await this.saveMutationCount(this.mutations);
        } catch (e) {
            const err = `An error occurred while trying to save mutation count.`;
            this.log.error(err, e.message);
            throw new Error(err);
        }
    }

    private updateMutationCount(operationId: string, mutationId: UUID, requestId: UUID): number {
        try {

            let index = this.getIndex(operationId);
            if (index === -1) {
                const mutationCount: MutationsCount = new MutationsCount(operationId);
                mutationCount.addMutation(mutationId);
                index = this.mutations.push(mutationCount) - 1;
            }

            if (!this.mutations[index].getMutation(mutationId))
                this.mutations[index].addMutation(mutationId);

            this.mutations[index].addRequest(mutationId, requestId);
            return index;

        } catch (e) {
            const err = `An error occurred while trying to update mutation count.`;
            this.log.error(err, e.message);
            throw new Error(err);
        }
    }

    private getIndex(operationId: string): number {
        return this.mutations.findIndex((mc) => mc.getOperationId() === operationId);
    }

    private async saveMutationCount(mutationCount: any) {
        try {
            await this.storage.saveMutationCount(this.fuzzerId, mutationCount);
        } catch (e) {
            const err = `An error occurred while trying to save mutation count.`;
            this.log.error(err, e.message);
            throw new Error(err);
        }
    }

}