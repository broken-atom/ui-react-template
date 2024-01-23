import { create_toast, generate_nanoid, generate_nanoid_al, generate_ulid } from "../utils";
import * as rxjs from "rxjs";

export const broken_init = {
    app_id: null,
    utils: {
        ulid: () => generate_ulid(),
        nanoid: (size?: number) => generate_nanoid(size),
        nanoid_al: (size?: number) => generate_nanoid_al(size),
        feedback: (text: string, type?: "log" | "error" | "warn" | "success", timer?: number) => create_toast(text, type, timer),
    },
    rxjs
};

export default {};