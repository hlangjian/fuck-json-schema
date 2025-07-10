
export interface RustFile {
    module: RustModule;
    function: RustFunction;
    struct: RustStruct;
    enum: RustEnum;
    trait: RustTrait;
    impl: RustImpl;
    use: RustUse;
    constant: RustConstant;
    static: RustStatic;
}


export interface RustModule {
    module: RustModule;
    function: RustFunction;
    struct: RustStruct;
    enum: RustEnum;
    trait: RustTrait;
    impl: RustImpl;
    use: RustUse;
    constant: RustConstant;
    static: RustStatic;
}


export interface RustFunction {
    parameter: RustParameter;
    statement: RustStatement;
}


export interface RustStruct {
    field: RustField;
    impl: RustImpl;
}


export interface RustField { }


export interface RustEnum {
    variant: RustEnumVariant;
}


export interface RustEnumVariant { }


export interface RustTrait {
    methodSignature: RustMethodSignature;
    associatedType: RustAssociatedType;
    associatedConstant: RustAssociatedConstant;
}


export interface RustImpl {
    method: RustMethod;
    associatedFunction: RustAssociatedFunction;
    associatedConstant: RustAssociatedConstant;
}


export interface RustMethod {
    parameter: RustParameter;
    statement: RustStatement;
}


export interface RustAssociatedFunction {
    parameter: RustParameter;
    statement: RustStatement;
}


export interface RustMethodSignature {
    parameter: RustParameter;
}


export interface RustParameter { }


export interface RustStatement { }


export interface RustUse { }


export interface RustConstant { }


export interface RustStatic { }


export interface RustAssociatedType { }


export interface RustAssociatedConstant { }