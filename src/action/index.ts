import type { G_TYPE } from "../types/g-type";

const init = async (G: G_TYPE)=>{
    if(!G){
        console.warn("Global object is not passed to init function");
        return;
    }
    console.log("INIT MODULE ACTION: ");

    
    // do other things
    G.actions = G.actions || {};



    // add functions to actions
    G.actions['add'] = {
        name: "Add",
        description: "Add two numbers",
        function: (a: number, b: number)=>{
            return a + b;
        }
    }
} 
export default {
    init
}