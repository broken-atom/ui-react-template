import React, { useEffect, useState } from "react";
import g_fn from "../g_fn";

import {observer} from "mobx-react-lite"


const MobileOtp = (props) => {

    let idx = props.idx; // for node it's required
    const app_id = g_fn.AS.app.id;
    const app_name = g_fn.AS.app.name;
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [attempts, setAttempts] = useState(5);
    const [hash, setHash] = useState('');
    const [resendDisabled, setResendDisabled] = useState(false);
    const [currentStep, setCurrentStep] = useState('phone'); // 'phone' or 'otp'
    const otp_login = g_fn.get_otp_login();

    const handleSendOtp = async () => {
        const errors = [];
        // Validate phone number (assuming 10 digits for simplicity)
        if (phoneNumber.length !== 10) {
            g_fn.feedback('Invalid phone number. Please enter a 10-digit phone number.', "warn");
            return;
        }

        setCurrentStep('otp');

        const res = await g_fn.bro_otp_create(phoneNumber, app_name, app_id, props.role);

        if (!res.success) {
            g_fn.feedback(`Error: ${res.errors}`, "error");
            return;
        }

        // FOR OFFLINE MODULE, ON FIRST HIT, THE TOKEN IS SENT
        if (res.data.token) {
            return g_fn.set_token_after_login(res);
        }

        setHash(res.data.hash);

        g_fn.feedback("OTP Sent!", "log");
        setResendDisabled(true);

        // Simulate a delay before allowing resend
        setTimeout(() => {
            setResendDisabled(false);
        }, 5000); // 5000 milliseconds (5 seconds) delay before allowing resend
    };

    const handleVerifyOtp = async () => {
        const errors = [];

        // Send to API
        const res = await g_fn.bro_otp_verify(phoneNumber, otp, hash, app_id, props.role);

        if (!res.success) {
            g_fn.feedback(`Errors: ${res.errors}`, "warn");
            const curr_attempts = attempts - 1;
            setAttempts(curr_attempts);
            if (curr_attempts === 0) {
                g_fn.feedback('Maximum attempts reached. Please try again later.', "error");
                // Reset values after maximum attempts reached
                setOtp('');
                setAttempts(5);
                setCurrentStep('phone'); // Move back to asking for phone number
            } else {
                g_fn.feedback(`Incorrect OTP. ${curr_attempts} attempts left.`, "error");
            }

            // Change hash
            setHash(res.data.hash);
            return;
        }

        // Login to system
        setOtp('');
        setAttempts(5);
        setCurrentStep('phone'); // Move back to asking for phone number
    };

    useEffect(() => {
        // Disable the "Resend OTP" button if attempts are exhausted
        if (attempts === 0) {
            setResendDisabled(true);
        }
    }, [attempts]);

    return (
        <div className={`w-full mx-auto ${otp_login ? "" : "hidden"}`}>
            {/* <h2 className="text-2xl font-bold mb-4 text-center">Mobile OTP Verification</h2> */}

            {currentStep === 'phone' && (
                <div className="mb-4">
                    <label htmlFor="phoneNumber" className="block text-gray-700 text-sm font-bold mb-2">
                        Enter Phone Number:
                    </label>
                    <input
                        type="text"
                        id="phoneNumber"
                        name="phoneNumber"
                        placeholder="Enter 10-digit phone number"
                        value={phoneNumber}
                        maxLength={10}
                        onChange={(e) => {
                            // Only allow numbers
                            const re = /^[0-9\b]+$/;
                            if (e.target.value === '' || re.test(e.target.value)) setPhoneNumber(e.target.value)
                        }}
                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-md"
                    />
                </div>
            )}

            {currentStep === 'otp' && (
                <div className="mb-4">
                    <label htmlFor="otp" className="block text-gray-700 text-sm font-bold mb-2">
                        Enter OTP:
                    </label>
                    <input
                        type="text"
                        id="otp"
                        name="otp"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-md"
                    />
                </div>
            )}

            {currentStep === 'otp' && (
                <div className="mb-4">
                    <p className={`text-red-500 ${attempts === 0 ? 'font-bold' : ''}`}>
                        {attempts === 0 ? 'Maximum attempts reached. Please try again later.' : ''}
                        {attempts > 0 && `Attempts left: ${attempts}`}
                    </p>
                </div>
            )}

            <div className="flex items-center justify-center mb-4">
                {currentStep === 'phone' && (
                    <div className="flex flex-col items-center justify-center w-80 mx-auto" onClick={handleSendOtp}>
                        <button className="flex items-center bg-white border border-gray-300 rounded-lg shadow-md px-6 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 w-full justify-center">
                            Send OTP
                        </button>
                    </div>
                )}
                {currentStep === 'otp' && (
                    <div className="flex flex-col items-center justify-center w-80 mx-auto" onClick={handleVerifyOtp}>
                        <button className="flex items-center bg-white border border-gray-300 rounded-lg shadow-md px-6 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 w-full justify-center">
                            Verify OTP
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


const BROKEN_JSX = () => <div className="h-screen w-screen flex items-center justify-center text-gray-500 font-semibold bg-gray-100">DEFAULT LOGIN</div>


const Login = (props) => {

    let idx = props.idx; // for node it's required
    const AS = g_fn.AS;


    const [user, set_user] = useState({ email: "" });
    const [roles, set_roles] = useState<any[]>([]);
    const [selected_role, set_selected_role] = useState("");

    const [mail_sending, set_mail_sending] = useState(false);
    const [mail_sent, set_mail_sent] = useState(false);

    useEffect(() => {
        const roles = g_fn.get_roles();
        if (!roles) return;
        set_roles(roles);
        set_selected_role(roles[0]);
    }, []);

    // if already logged in, and path is /login redirect to home
    const check_if_logged_in = () => {
        const path = window.location.pathname;
        if (path === "/login") {
            if (AS.user) {
                AS.navigate("/");
            }
        }
        else if (path.endsWith("/login")) { //  /appid/uiid/login
            if (AS.user) {
                AS.navigate(""); //
            }
        }
    }
    useEffect(() => {
        check_if_logged_in();

        const sub = AS.rx_user.subscribe(user => {
            check_if_logged_in();
        });

        return () => sub.unsubscribe();
    }, []);

    const PreviewAs = () => {
        if (!g_fn.AS.is_dev) return null;

        return (
            <div className="w-full inline-flex items-center">
                <div className="w-32">
                    Preview as:
                </div>
                <select className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" value={selected_role} onChange={(e) => set_selected_role(e.target.value)}>
                    {roles.map(r => {
                        return (
                            <option key={r} value={r}>{r}</option>
                        )
                    })}
                </select>
            </div>
        )
    }


    const on_email_input = (e) => {
        if (AS.is_dev_edit_mode) return;
        g_fn.bro_on_input(e, set_user);
    }

    const on_email_send = async (e) => {
        if (AS.is_dev_edit_mode) return;

        set_mail_sending(true);
        const s = await g_fn.bro_login(e, user, set_user, selected_role);
        set_mail_sending(false);
        set_mail_sent(s||false);
    }


    const EmailSending = () => {
        return (
            <div>
                {mail_sending ? (
                    <svg aria-hidden="true" className="w-6 h-6 text-gray-200 animate-spin fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M100 50.59c0 27.615-22.386 50.001-50 50.001s-50-22.386-50-50 22.386-50 50-50 50 22.386 50 50Zm-90.919 0c0 22.6 18.32 40.92 40.919 40.92 22.599 0 40.919-18.32 40.919-40.92 0-22.598-18.32-40.918-40.919-40.918-22.599 0-40.919 18.32-40.919 40.919Z" fill="currentColor" /><path d="M93.968 39.04c2.425-.636 3.894-3.128 3.04-5.486A50 50 0 0 0 41.735 1.279c-2.474.414-3.922 2.919-3.285 5.344.637 2.426 3.12 3.849 5.6 3.484a40.916 40.916 0 0 1 44.131 25.769c.902 2.34 3.361 3.802 5.787 3.165Z" fill="currentFill" /></svg>
                ) : (
                    <span className="h-6 flex items-center">{mail_sent ? "Login" : "Mail me a magic link"}</span>
                )}
            </div>
        )
    }


    const on_google_login = (e) => {
        if (AS.is_dev_edit_mode) return;
        g_fn.bro_google_login(selected_role);
    }

    const on_microsoft_login = (e) => {
        if (AS.is_dev_edit_mode) return;
        g_fn.bro_microsoft_login(selected_role);
    }

    const on_github_login = (e) => {
        if (AS.is_dev_edit_mode) return;
        g_fn.bro_github_login(selected_role);
    }

    const on_linkedin_login = (e) => {
        if (AS.is_dev_edit_mode) return;
        g_fn.bro_linkedin_login(selected_role);
    }

    const on_twitter_login = (e) => {
        if (AS.is_dev_edit_mode) return;
        g_fn.bro_twitter_login(selected_role);
    }

    // replace this to false if custom login is not available
    // b@custom-login
    const CUSTOM_LOGIN = false;
    if (CUSTOM_LOGIN) return (
        // b@broken-jsx start
        <BROKEN_JSX /> // EDITABLE LOGIN IMPLEMENTATION
        // b@broken-jsx end
    )


    return (
        <div className="flex flex-col justify-center items-center bg-white py-5">
            <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 w-full max-w-md space-y-6">
                <div className="text-3xl font-bold text-center text-white">
                    <span className="bg-gradient-to-r text-transparent from-blue-500 to-purple-500 bg-clip-text">
                        Login to {AS.app.name}
                    </span>
                </div>

                <PreviewAs />

                <div>
                    <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Enter Email Address:</label>
                    <input type="email" name="email" onInput={on_email_input} placeholder="Email Address" className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-md" />
                </div>

                <div className="flex flex-col items-center justify-center w-80 mx-auto" onClick={on_email_send}>
                    <button className="flex items-center bg-white border border-gray-300 rounded-lg shadow-md px-6 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 w-full justify-center">
                        <EmailSending />
                    </button>
                </div>



                {/* OTP */}
                {/* For components to work in generated react code, components should be tagged under react */}
                {/* <react name="MobileOtp" role={selected_role}></react> */}
                <MobileOtp role={selected_role} />





                {/* OAUTHS */}
                <div className="flex items-center justify-center w-80 mx-auto" onClick={on_google_login}>
                    <button className="flex items-center bg-white border border-gray-300 rounded-lg shadow-md px-6 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 w-full justify-center">
                        <svg className="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="-0.5 0 48 48"><g fill="none" fill-rule="evenodd"><path d="M9.827 24c0-1.524.253-2.986.705-4.356l-7.909-6.04A23.456 23.456 0 0 0 .213 24c0 3.737.868 7.26 2.407 10.388l7.905-6.05A13.885 13.885 0 0 1 9.827 24" fill="#FBBC05" /><path d="M23.714 10.133c3.311 0 6.302 1.174 8.652 3.094L39.202 6.4C35.036 2.773 29.695.533 23.714.533a23.43 23.43 0 0 0-21.09 13.071l7.908 6.04a13.849 13.849 0 0 1 13.182-9.51" fill="#EB4335" /><path d="M23.714 37.867a13.849 13.849 0 0 1-13.182-9.51l-7.909 6.038a23.43 23.43 0 0 0 21.09 13.072c5.732 0 11.205-2.036 15.312-5.849l-7.507-5.804c-2.118 1.335-4.786 2.053-7.804 2.053" fill="#34A853" /><path d="M46.145 24c0-1.387-.213-2.88-.534-4.267H23.714V28.8h12.604c-.63 3.091-2.346 5.468-4.8 7.014l7.507 5.804c4.314-4.004 7.12-9.969 7.12-17.618" fill="#4285F4" /></g></svg>
                        <span>Continue with Google</span>
                    </button>
                </div>

                <div className="flex items-center justify-center w-80 mx-auto" onClick={on_microsoft_login}>
                    <button className="flex items-center bg-white border border-gray-300 rounded-lg shadow-md px-6 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 w-full justify-center">
                        <svg className="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23"><path fill="#f3f3f3" d="M0 0h23v23H0z" /><path fill="#f35325" d="M1 1h10v10H1z" /><path fill="#81bc06" d="M12 1h10v10H12z" /><path fill="#05a6f0" d="M1 12h10v10H1z" /><path fill="#ffba08" d="M12 12h10v10H12z" /></svg>
                        <span>Continue with Microsoft</span>
                    </button>
                </div>

                <div className="flex items-center justify-center w-80 mx-auto" onClick={on_github_login}>
                    <button className="flex items-center bg-white border border-gray-300 rounded-lg shadow-md px-6 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 w-full justify-center">
                        <svg className="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.705 0C5.232 0 0 5.271 0 11.791c0 5.212 3.352 9.624 8.003 11.186.581.117.794-.254.794-.566 0-.273-.019-1.21-.019-2.187-3.256.703-3.934-1.406-3.934-1.406-.523-1.367-1.299-1.718-1.299-1.718-1.066-.722.078-.722.078-.722 1.182.078 1.802 1.21 1.802 1.21 1.046 1.796 2.732 1.288 3.41.976.097-.761.407-1.288.736-1.581-2.597-.273-5.329-1.288-5.329-5.818 0-1.288.465-2.343 1.201-3.162-.116-.293-.523-1.503.116-3.124 0 0 .988-.312 3.217 1.21a11.253 11.253 0 0 1 2.926-.391c.988 0 1.996.137 2.926.391 2.229-1.523 3.217-1.21 3.217-1.21.64 1.62.232 2.831.116 3.124.756.82 1.202 1.874 1.202 3.162 0 4.529-2.732 5.525-5.348 5.818.426.371.794 1.074.794 2.186 0 1.581-.019 2.85-.019 3.241 0 .312.213.684.794.566a11.782 11.782 0 0 0 8.003-11.186C23.409 5.271 18.157 0 11.705 0z" fill="#24292f" /></svg>
                        <span>Continue with Github</span>
                    </button>
                </div>

                <div className="flex items-center justify-center w-80 mx-auto" onClick={on_linkedin_login}>
                    <button className="flex items-center bg-white border border-gray-300 rounded-lg shadow-md px-6 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 w-full justify-center">
                        <svg className="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 -2 44 44"><path d="M44 40h-9.725V25.938c0-3.68-1.52-6.193-4.866-6.193-2.558 0-3.981 1.696-4.643 3.33-.249.586-.21 1.403-.21 2.22V40h-9.634s.124-24.909 0-27.173h9.634v4.265c.57-1.865 3.648-4.526 8.56-4.526C39.211 12.566 44 16.474 44 24.891V40ZM5.18 9.428h-.063C2.013 9.428 0 7.351 0 4.718 0 2.034 2.072 0 5.239 0c3.164 0 5.11 2.029 5.171 4.71 0 2.633-2.007 4.718-5.23 4.718Zm-4.07 3.399h8.576V40H1.11V12.827Z" fill="#007EBB" fill-rule="evenodd" /></svg>
                        <span>Continue with LinkedIn</span>
                    </button>
                </div>

                <div className="flex items-center justify-center w-80 mx-auto" onClick={on_twitter_login}>
                    <button className="flex items-center bg-white border border-gray-300 rounded-lg shadow-md px-6 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 w-full justify-center">
                        <svg className="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 -4 48 48"><path d="M48 4.735a19.235 19.235 0 0 1-5.655 1.59A10.076 10.076 0 0 0 46.675.74a19.395 19.395 0 0 1-6.257 2.447C38.627 1.225 36.066 0 33.231 0c-5.435 0-9.844 4.521-9.844 10.098 0 .791.085 1.56.254 2.3-8.185-.423-15.44-4.438-20.3-10.555a10.281 10.281 0 0 0-1.332 5.082c0 3.502 1.738 6.593 4.38 8.405a9.668 9.668 0 0 1-4.462-1.26v.124c0 4.894 3.395 8.977 7.903 9.901a9.39 9.39 0 0 1-2.595.356 9.523 9.523 0 0 1-1.854-.18c1.254 4.01 4.888 6.932 9.199 7.01-3.37 2.71-7.618 4.325-12.23 4.325-.795 0-1.58-.047-2.35-.139C4.359 38.327 9.537 40 15.096 40c18.115 0 28.019-15.385 28.019-28.73 0-.439-.009-.878-.026-1.308A20.211 20.211 0 0 0 48 4.735" fill="#00AAEC" fill-rule="evenodd" /></svg>
                        <span>Continue with Twitter</span>
                    </button>
                </div>
            </div>
        </div>
    )
}


export default observer(Login);