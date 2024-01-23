import { z } from 'zod';
export const z_node_filters_data = z.object({
	id: z.string(),
	name: z.string(),
	filter: z.array(z.object({
		id: z.string(),
		attr: z.string(),
		op: z.string(),
		val: z.any(),
		meta: z.any()
	})),
	data: z.array(z.record(z.string())).optional(), // it's the Model data [], all filter based on this are of type key === value
	enabled: z.boolean().optional(),
	static: z.boolean().optional(),
	live: z.boolean().optional(),
	realtime: z.boolean().optional(),
});
export const z_node_filters_datas = z.array(z_node_filters_data);

export type T_NODE_FILTERS_DATAS = z.infer<typeof z_node_filters_datas>;
export type T_NODE_FILTERS_DATA = z.infer<typeof z_node_filters_data>;
export type T_NODE_FILTERS = { [id: string]: T_NODE_FILTERS_DATAS}



export type FILTER_OBJECT = {
    static_filters: T_NODE_FILTERS,
    text_filters: string[],
    filters: T_NODE_FILTERS,
    sorts: {[k:string]: "ASC" | "DESC"}[],
    limit: number,

    cursor_first?: string,
    cursor_last?: string,
    offset?: number,
}
export type FILTER_PARAMS = {
    unique: false,
    filters: any[],
    sorts: {[k:string]: "ASC" | "DESC"}[],
    limit: number,

    cursor_first?: string,
    cursor_last?: string,
    offset?: number,
    id : undefined
}
export type ID_PARAMS = {
    unique: true, 
    id: string,
    limit: 1
}
export type FINAL_FILTERS = {
    filters : {op : string, attr : string, val : any}[],
    sort : {attr : string, order : string},
    limit : number,
    unique : false,
    id : string
}
export type QUERY_PARAMS = FILTER_PARAMS | ID_PARAMS | FINAL_FILTERS;
