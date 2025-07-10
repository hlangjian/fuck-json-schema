
export interface JavaScriptFile {

    class: JavaScriptClass;

    function: JavaScriptFunction;

    variable: JavaScriptVariable;



    interface: JavaScriptInterface;
}


export interface JavaScriptClass {

    class: JavaScriptClass;

    method: JavaScriptMethod;

    property: JavaScriptProperty;
}


export interface JavaScriptFunction {

    function: JavaScriptFunction;

    parameter: JavaScriptParameter;

    statement: JavaScriptStatement;
}


export interface JavaScriptVariable {

    property: JavaScriptProperty;
}


export interface JavaScriptMethod {

    parameter: JavaScriptParameter;

    statement: JavaScriptStatement;
}


export interface JavaScriptProperty { }


export interface JavaScriptParameter { }


export interface JavaScriptStatement { }


export interface JavaScriptInterface {

    property: JavaScriptProperty;

    method: JavaScriptMethod;
}