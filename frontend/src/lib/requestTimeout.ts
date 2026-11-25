// Overpass runs two bounded attempts within a 30s backend deadline.
// Keep proxy/network headroom only for this operation; ordinary calls stay at 20s.
export function requestTimeout(path:string):number {
  return path.split('?')[0]==='/api/v1/prospecting/leads/search'?35000:20000
}
