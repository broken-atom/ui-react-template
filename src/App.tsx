import React, { useState, useEffect } from "react";
import "./app.css";

import {
    createBrowserRouter,
    RouterProvider,
    Routes,
    Route,
    Link,
} from "react-router-dom";

import { Toaster } from "react-hot-toast";

import ErrorPage from "./utility/error-page";

import MAIN_COMP from "./comp/main";

import g_fn from "./g_fn";
import Login from "./user/Login";

import { Subscription } from "rxjs";

const AS = g_fn.AS;



// @todo: integrate stdlib and then remove this
// import {setupOfflineStdLib} from "./utility/stdlib-offline.ts";
// setupOfflineStdLib();


// import STDLIB from "./stdlib";
// STDLIB.init(g_fn.GET_GC().APP_ID);
// window.broken.current = window.broken.online;

// @ts-ignore
window.g_fn = g_fn;




const router = createBrowserRouter([
    // for app.brokenatom.io
    {
        path: "/:app_id/:ui_id/login",
        element: <Login />,
    },
    {
        path: "/:app_id/:ui_id/*",
        element: <MAIN_COMP />,
        errorElement: <ErrorPage />,
    },

    // for custom domains
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/*",
        element: <MAIN_COMP />,
        errorElement: <ErrorPage />,
    },
]);

function App() {
    const [count, setCount] = useState(0);

    const [M, set_M] = useState({});
    const [user, set_user] = useState(AS.user);
    const [show_login, set_show_login] = useState(AS.rx_show_login.value);
    const [std_lib_loaded, set_std_lib_loaded] = useState(false);

    useEffect(() => {
        const subs: Subscription[] = [];

        const on_key_up = (e) => {
            if (e.key === "p" || e.key === "P") {
                if (g_fn.is_event_in_editing_mode(e)) return;
                g_fn.runtime_select_next_page(e.key === "P");
            }
        };

        window.addEventListener("keyup", on_key_up);

        // APP SETUP
        g_fn.g_app_init({});

        subs.push(
            AS.rx_boken_module.subscribe((B) => {
                if (B) {
                    console.log("BROKEN MODULE LOADED");
                    set_std_lib_loaded(true);

                    // fix it so that we load App only once api is loaded
                    g_fn.get_user_profile();
                }
            })
        );

        // USER
        subs.push(
            AS.rx_user.subscribe((user) => {
                set_user(user);

                if (!user) return;
                if (user.from_database) return;
                g_fn.get_user_profile();
            })
        );

        subs.push(
            AS.rx_token.subscribe((token) => {
                g_fn.get_user_profile();
            })
        );

        subs.push(
            AS.rx_show_login.subscribe((show_login) => {
                set_show_login(show_login);
            })
        );

        return () => {
            window.removeEventListener("keyup", on_key_up);
            subs.forEach((s) => s.unsubscribe());
        };
    }, []);

    // Loading STD LIB
    // if (!std_lib_loaded) {
    //     return (
    //         <div className="h-screen w-full h-max-[1000px] bg-[var(--primary-200)] text-[var(--secondary--600)] flex justify-center items-center">
    //             <div className="text-xl font-semibold animate-bounce">
    //                 Loading Broken standard Library
    //             </div>
    //         </div>
    //     );
    // }


    // LOGIN IF NOT LOGGED IN and ENABLED
    if (AS.enable_login && show_login && !user) return (
        <div>
            <Login />
            <Toaster/>
        </div>
    );


    return (
        <div>
            <RouterProvider router={router} />
            <Toaster/>
        </div>
    )
}

export default App;
