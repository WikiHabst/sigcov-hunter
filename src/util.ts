import { SERVER_URL } from "./const";

export const getNsHits = async (title: string, clipsPg: number = 0) => {
  return await ((await fetch(SERVER_URL + `/news?` + new URLSearchParams({ title, pg: String(clipsPg) })))).json();
}
