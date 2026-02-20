
export class Validator {

    constructor(
        public isValid: boolean,
        public errors?: any[],
        public matchedStatusCode?: string | undefined,
        public details?: any | undefined
    ) {
    }

}