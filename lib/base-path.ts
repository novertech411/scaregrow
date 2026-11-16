// Mirrors next.config.mjs basePath. next/link, useRouter and redirect() add it automatically;
// use withBase() for plain <img>/<a>, fetch() and absolute URLs handed to Supabase.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
export function withBase(path: string) { return `${BASE_PATH}${path}` }
