import { z } from 'zod';

const zod_user_props = z.object({
    id: z.string(),
    name: z.string(),
    image_url: z.string(),
    role: z.string(),
    universe: z.number(),
    level: z.number(),
    app_id: z.string().optional(),
    scope: z.record(z.string()).optional(),
    created_at: z.number(),
    org: z.string().optional(),
    team: z.string().optional(),
    verified_at: z.number(),
    modified_at: z.number().optional()
})

export const zod_user_with_mobile = zod_user_props.extend({
    mobile: z.string(),
    email: z.string().email().optional()
});

export const zod_user_with_email = zod_user_props.extend({
    mobile: z.string().optional(),
    email: z.string().email()
});

export const zod_user = z.union([zod_user_with_email, zod_user_with_mobile]);

export const zod_login_response = z.object({
    response: z.string(),
    token: z.string(),
    user: zod_user
});




export const zod_user_acc = z.union([
    z.literal('free'),
    z.literal('standard'),
    z.literal('professional')
]);

export const zod_subscribe_reccurence = z.union([
    z.literal('MONTHLY'),
    z.literal('YEARLY')
]);


export type user_props_type = z.infer<typeof zod_user_props>;
export type user_type = z.infer<typeof zod_user>;
export type user_with_mobile_type = z.infer<typeof zod_user_with_mobile>;
export type user_with_email_type = z.infer<typeof zod_user_with_email>;
export type login_response_type = z.infer<typeof zod_login_response>;
export type user_acc_type = z.infer<typeof zod_user_acc>;
export type subscribe_reccurence_type = z.infer<typeof zod_subscribe_reccurence>;


export default {};