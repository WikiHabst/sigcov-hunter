import { useEffect, useState } from 'react'
import './App.css'

const SERVER_URL = 
  import.meta.env.DEV ? '//localhost:8000' :
  'https://sigcovhunter.toolforge.org';

type NSHit = {
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
type Top = {
  username: string,
  score: number,
};

function App() {
  const [source, setSource] = useState<string>('billedmammal');
  const [titles, setTitles] = useState<string[]>([]);
  const [nsHits, setNsHits] = useState<NSHit[] | null>(null);
  const [error, setError] = useState<string>();

  const [me, setMe] = useState<any>(null);
  const [top, setTop] = useState<Top[]>([]);

  const [title, setTitle] = useState<string>('');
  const [artHtml, setArtHtml] = useState<string>('');

  useEffect(() => {
    fetch(SERVER_URL + '/me', { credentials: 'include' }).then(r => {
      if (r.ok) return r.json();
      return undefined;
    }).then(me => setMe(me));
    fetch(SERVER_URL + '/top', { credentials: 'include' }).then(r => r.json()).then(top => setTop(top));
  }, []);
  useEffect(() => {
    (async () => {
      switch (source) {
        case 'billedmammal': {
          // https://en.wikipedia.org/wiki/User:BilledMammal/Sports_articles_probably_lacking_SIGCOV
          setTitles(await (await fetch(`articles/billedmammal.json`)).json());
        }
      }
    })();
  }, [source]);
  useEffect(() => {
    (async () => {
      if (title) {
        const r = await (await fetch(`https://en.wikipedia.org/w/api.php?${new URLSearchParams({
          action: 'parse',
          format: 'json',
          origin: '*',
          page: title,
          prop: 'text',
          formatversion: '2',
        })}`)).json();
        const html = r.parse.text;
        setArtHtml(html);

        setNsHits(await (await fetch(SERVER_URL + `/news?` + new URLSearchParams({ title }))).json());
      }
    })();
  }, [title]);

  return (
    <>
      {error}
      <h1><a href="https://enwp.org/WP:SIGCOV">WP:SIGCOV</a> Hunter 🎯</h1>
      {me ? `Logged in as ${me.username}, ${me.score} points` : <button onClick={(evt) => {
        evt.preventDefault();
        window.open(SERVER_URL + '/login', "_self");
      }}>Log in</button>}<br /><br />
      <label htmlFor="source">Source: </label>
      <select name="source" value={source} onChange={v => setSource(v.target.value)}>
        <option value="billedmammal">BilledMammal list</option>
      </select><br />
      {titles.length ? <div>
        <button onClick={async () => {
          const rndTitle = 'Elvis Marecos';
          // const rndTitle = titles[Math.floor(Math.random() * titles.length)];
          setNsHits(null);
          setTitle(rndTitle);
        }}>Get Un(der)referenced Article 📝</button>
        <h1>{title}</h1>
        {title && <div style={{ display: 'flex' }}>
          <div className="article" dangerouslySetInnerHTML={{ __html: artHtml }} />
          <div style={{ flexBasis: '50%' }}>
            <span style={{ fontWeight: 'bold' }}>Newspapers.com</span> hits:{' '}
            {nsHits ? nsHits.length ? nsHits.map((nsHit, i) => (
              <div key={i} className="parchment" onClick={async () => {
                try {
                  const pages = await (await fetch('https://www.wikidata.org/w/api.php?' + new URLSearchParams({
                    action: 'query',
                    format: 'json',
                    list: 'search',
                    srsearch: `haswbstatement:P7259=${nsHit.publication.id}`,
                    origin: '*',
                  }))).json();
                  const qid = pages.query.search[0]?.title;
                  let paperTitle;
                  if (qid) {
                    const entity = await (await fetch('https://www.wikidata.org/w/api.php?' + new URLSearchParams({
                      action: 'wbgetentities',
                      format: 'json',
                      ids: qid,
                      origin: '*',
                    }))).json();
                    const sitelinks = entity.entities[qid].sitelinks;
                    paperTitle = sitelinks.enwiki?.title;
                  }
                  const snip = '...' + nsHit.snipBefore + nsHit.baseMatch + nsHit.snipAfter + '...';
                  const ref = `<ref>{{cite web |title=${snip} |url=${nsHit.url} |work=${paperTitle ? `[[${paperTitle}]]` : `${nsHit.publication.name} |location=${nsHit.publication.location}`} |page=${nsHit.pageNo} |date=${nsHit.date}}}</ref>`;
                  const textResp = await (await fetch(`https://en.wikipedia.org/w/api.php?${new URLSearchParams({
                    origin: '*',
                    action: 'query',
                    prop: 'revisions',
                    rvprop: 'content',
                    format: 'json',
                    titles: title,
                    rvslots: 'main',
                    rvsection: '0',
                    formatversion: '2',
                  })}`)).json();
                  const wikitext = textResp.query.pages[0].revisions[0].slots.main.content + ref;

                  await (await fetch(SERVER_URL + '/edit', {
                    headers: { 'Content-type': 'application/json' },
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({
                      // title,
                      // text: wikitext,
                      title: 'User:Habst/sandbox2',
                      text: wikitext.replaceAll('Category:', ':Category:'),
                    }),
                  })).json();
                } catch (e) {
                  console.error(e);
                  setError(JSON.stringify(e));
                }
              }}>
                In {nsHit.publication.name} ({nsHit.publication.location}), {nsHit.date}, page {nsHit.pageNo}:<br />
                ...{nsHit.snipBefore}<span style={{ fontWeight: 'bold' }}>{nsHit.baseMatch}</span>{nsHit.snipAfter}...
              </div>
            )) : 'None 🙁' : 'Loading...'}
          </div>
        </div>}
      </div> : 'Loading...'}
      <h2>Top users</h2>
      {top.map(t => <li key={t.username}>{top.findIndex(t2 => t2.score === t.score) + 1}. <a href={`https://enwp.org/User:${t.username}`}>User:{t.username}</a>, {t.score} points</li>)}
    </>
  )
}

export default App
