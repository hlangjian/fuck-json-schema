
export interface PythonFile {
    class: PythonClass;
    function: PythonFunction;
    variable: PythonVariable;
    import: PythonImport;
}


export interface PythonClass {
    method: PythonMethod;
    constructor: PythonConstructor;
    property: PythonProperty;
    nestedClass: PythonClass;
    nestedFunction: PythonFunction;
}


export interface PythonFunction {
    parameter: PythonParameter;
    statement: PythonStatement;
    docstring: PythonDocstring;
    nestedFunction: PythonFunction;
}


export interface PythonMethod {
    parameter: PythonParameter;
    statement: PythonStatement;
    docstring: PythonDocstring;
}


export interface PythonConstructor {
    parameter: PythonParameter;
    statement: PythonStatement;
    docstring: PythonDocstring;
}


export interface PythonVariable { }


export interface PythonImport { }


export interface PythonParameter { }


export interface PythonStatement { }


export interface PythonProperty { }


export interface PythonDocstring { }