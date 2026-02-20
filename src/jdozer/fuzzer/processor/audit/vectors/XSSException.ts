

export class XSSException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'XSSException';
    }
}