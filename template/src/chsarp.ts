
export interface CSharpFile {
    namespace: CSharpNamespace;
    usings: CSharpUsing;
}


export interface CSharpNamespace {
    class: CSharpClass;
    interface: CSharpInterface;
    enum: CSharpEnum;
    struct: CSharpStruct;
}


export interface CSharpClass {
    class: CSharpClass;
    interface: CSharpInterface;
    method: CSharpMethod;
    property: CSharpProperty;
    field: CSharpField;
    constructor: CSharpConstructor;
    enum: CSharpEnum;
    struct: CSharpStruct;
}


export interface CSharpInterface {
    method: CSharpMethod;
    property: CSharpProperty;
}


export interface CSharpMethod {
    parameter: CSharpParameter;
    statement: CSharpStatement;
}


export interface CSharpProperty { }


export interface CSharpField { }


export interface CSharpConstructor {
    parameter: CSharpParameter;
    statement: CSharpStatement;
}


export interface CSharpEnum {
    member: CSharpEnumMember;
}


export interface CSharpEnumMember { }


export interface CSharpStruct {
    method: CSharpMethod;
    property: CSharpProperty;
    field: CSharpField;
    constructor: CSharpConstructor;
}

export interface CSharpParameter { }

export interface CSharpStatement { }

export interface CSharpUsing { }