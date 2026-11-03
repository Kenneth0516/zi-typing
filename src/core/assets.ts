/** Resolve public files below Vite's deployment base, including GitHub Pages. */
export function assetUrl(path:string){return import.meta.env.BASE_URL+path.replace(/^\/+/, '');}
