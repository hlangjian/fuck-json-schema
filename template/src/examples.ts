import { type JavaFile } from "./java"
import { createTemplate } from "./create-template"

const file = createTemplate<JavaFile>(o => o.indent`
    import java.util.Date;

    ${o.class}
`)

const HelloWorldClass = file.class(o => o.indent`   
    public class HelloWorld {
        public static void main(String[] args) {
            System.out.println("Hello, world!");
            Date now = new Date();
            System.out.println("Current time: " + now);
        }

        ${o.method.join('\n\n')}
    }`)

HelloWorldClass.method(o => o.indent`
public String ToString(){
    return "Hello, world";
}
`)

HelloWorldClass.method(o => o.indent`
    public String Hash(){
        return "Hash";
    }
`)
