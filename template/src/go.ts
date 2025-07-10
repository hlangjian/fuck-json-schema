
export interface GoFile {
    package: GoPackage;
    import: GoImport;
    function: GoFunction;
    struct: GoStruct;
    interface: GoInterface;
    variable: GoVariable;
    constant: GoConstant;
}


export interface GoPackage { }


export interface GoImport { }


export interface GoFunction {
    parameter: GoParameter;
    statement: GoStatement;
}


export interface GoStruct {
    field: GoField;
    method: GoMethod;
}


export interface GoField { }


export interface GoInterface {
    methodSignature: GoMethodSignature;
}


export interface GoMethod {
    parameter: GoParameter;
    statement: GoStatement;
}


export interface GoMethodSignature {
    parameter: GoParameter;
}


export interface GoVariable { }


export interface GoConstant { }


export interface GoParameter { }


export interface GoStatement { }