
export class ProcessorException extends Error {
    constructor(error: {message: string, details?: any}) {
        super(error.message);
        this.name = 'ProcessorException';
    }
}