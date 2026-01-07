import { Logger } from "@nestjs/common";


export class SchemaValidatorCount {

    private readonly log = new Logger(SchemaValidatorCount.name);
    private operation: string;
    private count: any = {
        valid: 0,
        invalid: 0
    };

    constructor(operation: string) {
        this.operation = operation;
    }

    add(isValid: boolean): void {
        try {
            if (isValid)
                this.count.valid++;
            else
                this.count.invalid++;
        } catch (e) {
            const err = `An error occurred while adding the schema validation result.`;
            this.log.error(err, e.message);
            throw e;
        }
    }
}