
export interface JavaFile {
    class: JavaClass;
    interface: JavaInterface;
    enum: JavaEnum;
    annotation: JavaAnnotation;
    import: JavaImport;
    package: JavaPackage;
}


export interface JavaClass {
    class: JavaClass;
    interface: JavaInterface;
    enum: JavaEnum;
    annotation: JavaAnnotation;
    method: JavaMethod;
    field: JavaField;
    constructor: JavaConstructor;
}


export interface JavaInterface {
    method: JavaMethod;
    field: JavaField;
}


export interface JavaMethod {
    parameter: JavaParameter;
    statement: JavaStatement;
}


export interface JavaField { }


export interface JavaConstructor {
    parameter: JavaParameter;
    statement: JavaStatement;
}


export interface JavaEnum {
    member: JavaEnumMember;
    method: JavaMethod;
    field: JavaField;
}


export interface JavaEnumMember { }


export interface JavaAnnotation {
    member: JavaAnnotationMember;
}


export interface JavaAnnotationMember { }


export interface JavaParameter { }


export interface JavaStatement { }


export interface JavaImport { }


export interface JavaPackage { }