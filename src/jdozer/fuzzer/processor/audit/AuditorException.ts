import { Logger } from "@nestjs/common";


export class AuditorException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuditorException';
    }
}