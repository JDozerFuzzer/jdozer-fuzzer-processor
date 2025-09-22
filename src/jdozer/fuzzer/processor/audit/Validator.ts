

export class Validator {

    constructor(isValid: boolean, errors?: any[]) {
        this.isValid = isValid;
        this.errors = errors;
    }

    public isValid: boolean;
    public errors: any[] | undefined;

}