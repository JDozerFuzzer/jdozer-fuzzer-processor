import { Logger } from "@nestjs/common";
import { randomUUID, UUID } from "crypto";


export class KeyManager {

    private readonly log = new Logger(KeyManager.name);

    private readonly JDF: string = 'JDF';

    public forFuzzer(id: UUID): string {
        return this.JDF.concat(':').concat(id.toString());
    }

    public forOperation(id: string, fuzzerId: UUID): string {
        return this.forFuzzer(fuzzerId).concat(':OP:', id);
    }

    public forFake(fuzzerId: UUID, operation: string, context: string, fid: UUID): string {
        return this.forFuzzer(fuzzerId).concat(':DMM:', operation, ':', context, ':', fid.toString());
    }

    public forEngine(fuzzerId: UUID): string {
        return this.forFuzzer(fuzzerId).concat(':ENG');
    }

    private forReqAndRes(fuzzerId: UUID, operation: string, id: UUID): string {
        return this.forEngine(fuzzerId).concat(':', operation, ':', id.toString());
    }

    public forReqKeysByOperation(fuzzerId: UUID, operation: string): string {
        return this.forEngine(fuzzerId).concat(':', operation, ':*:REQ');
    }

    public forReq(fuzzerId: UUID, operation: string, id: UUID): string {
        return this.forReqAndRes(fuzzerId, operation, id).concat(':REQ');
    }

    public forRes(fuzzerId: UUID, operation: string, id: UUID): string {
        return this.forReqAndRes(fuzzerId, operation, id).concat(':RES');
    }

    public forApi(fuzzerId: UUID): string {
        return this.forFuzzer(fuzzerId).concat(':API');
    }

    public getUUIDForFuzz(fuzzer: string): UUID {
        return fuzzer.split(':')[1] as UUID;
    }

    public getUUIDForOperation(operation: string): UUID {
        return operation.split(':')[3] as UUID;
    }

    public forFuzz(fuzzerId: UUID, requestId: UUID): string {
        return this.forFuzzer(fuzzerId).concat(':FZZ:', requestId.toString());
    }

    public corContract(fuzzerId: UUID): string {
        return this.forFuzzer(fuzzerId).concat(':API');
    }

}