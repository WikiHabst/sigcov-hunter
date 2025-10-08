export const SERVER_URL = 
  import.meta.env.DEV ? '//localhost:8000' :
  'https://sigcovhunter.toolforge.org';

export type NSHit = {
  snipBefore: string,
  snipAfter: string,
  baseMatch: string,
  publication: {
    id: string,
    name: string,
    location: string,
  },
  date: string,
  pageNo: string,
  url: string,
};
export type NSHits = {
  hasMore: boolean,
  hits: NSHit[],
}
export type Top = {
  username: string,
  score: number,
};
export type EditResult = {
  edit: {
    result: 'Success',
    title: string,
    oldrevid: number,
    newrevid: number,
  }
}
export type Source = 'lackingsources' | 'billedmammal';
