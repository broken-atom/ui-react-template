import Dexie from "dexie";

export const db = new Dexie('resource_store');
db.version(1).stores({
    files: "++id,file",
    images: "++id,image",
});