import { createRef, useEffect, useState } from 'react'
import './App.css'
import Modal from './Modal';

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
type NSHits = {
  hasMore: boolean,
  hits: NSHit[],
}
type Top = {
  username: string,
  score: number,
};
type EditResult = {
  edit: {
    result: 'Success',
    title: string,
    oldrevid: number,
    newrevid: number,
  }
}
type Source = 'lackingsources' | 'billedmammal';

function App() {
  const [source, setSource] = useState<Source>('lackingsources');
  const [titles, setTitles] = useState<string[]>([]);
  const [nsHits, setNsHits] = useState<NSHits | null>(null);
  const [error, setError] = useState<string>();
  const [wikitext, setWikitext] = useState<string>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const wikitextRef = createRef<HTMLTextAreaElement>();
  const [refTag, setRefTag] = useState<string>('');
  const [refUrl, setRefUrl] = useState<string>('');
  const [editResult, setEditResult] = useState<EditResult | null>(null);
  const [clipsPg, setClipsPg] = useState<number>(0);

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
          break;
        }
        case 'lackingsources': {
          setTitles(await (await fetch(`articles/lackingsources.json`)).json());
          break;
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
  useEffect(() => {
    if (isModalOpen && wikitextRef.current && wikitext && refTag) {
      wikitextRef.current.scrollTop = wikitextRef.current.scrollHeight;
      wikitextRef.current.focus();
      wikitextRef.current.setSelectionRange(wikitext.length - refTag.length, wikitext.length);
    }
  }, [isModalOpen]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditResult(null);
  }

  return (
    <>
      {error}
      <h1><a href="https://enwp.org/WP:SIGCOV">WP:SIGCOV</a> Hunter 🎯</h1>
      {me ? `Logged in as ${me.username}, ${me.score} points` : <button onClick={(evt) => {
        evt.preventDefault();
        window.open(SERVER_URL + '/login', "_self");
      }}>Log in</button>}<br /><br />
      <label htmlFor="source">Source: </label>
      <select name="source" value={source} onChange={v => setSource(v.target.value as Source)}>
        <option value="lackingsources">Category:All articles lacking sources</option>
        <option value="billedmammal">BilledMammal list</option>
      </select><br />
      {titles.length ? <div>
        <button onClick={async () => {
          const rndTitle =
            // import.meta.env.DEV ? 'Elvis Marecos' :
            titles[Math.floor(Math.random() * titles.length)];
          setNsHits(null);
          setClipsPg(0);
          setTitle(rndTitle);
        }}>Get Un(der)referenced Article 📝</button>
        <h1>{title}</h1>
        {title && <div style={{ display: 'flex' }}>
          <div className="article" dangerouslySetInnerHTML={{ __html: artHtml }} />
          <div style={{ flexBasis: '50%' }}>
            <span style={{ fontWeight: 'bold' }}>Newspapers.com</span> hits:{' '}
            {nsHits ? nsHits.hits?.length ? nsHits.hits.map((nsHit, i) => (
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
                  const snip = '...' + (nsHit.snipBefore ?? '') + nsHit.baseMatch + (nsHit.snipAfter ?? '') + '...';
                  const refTag = `<ref>{{cite web |title=${snip} |url=${nsHit.url} |work=${paperTitle ? `[[${paperTitle}]]` : `${nsHit.publication.name} |location=${nsHit.publication.location}`} |page=${nsHit.pageNo} |date=${nsHit.date}}}</ref>`;
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
                  const wikitext = textResp.query.pages[0].revisions[0].slots.main.content + refTag;
                  setWikitext(wikitext);
                  setRefTag(refTag);
                  setIsModalOpen(true);
                  setRefUrl(nsHit.url);
                } catch (e) {
                  console.error(e);
                  setError(JSON.stringify(e));
                }
              }}>
                In {nsHit.publication.name} ({nsHit.publication.location}), {nsHit.date}, page {nsHit.pageNo}:<br />
                ...{nsHit.snipBefore}<span style={{ fontWeight: 'bold' }}>{nsHit.baseMatch}</span>{nsHit.snipAfter}...
              </div>
            )) : 'None 🙁' : 'Loading...'}
            {clipsPg >= 1 && <button onClick={async () => {
              setNsHits(await (await fetch(SERVER_URL + `/news?` + new URLSearchParams({ title, pg: String(clipsPg - 1)}))).json());
              setClipsPg(clipsPg - 1);
            }}>Prev page ({clipsPg})</button>}
            {nsHits?.hasMore && <button onClick={async () => {
              setNsHits(await (await fetch(SERVER_URL + `/news?` + new URLSearchParams({ title, pg: String(clipsPg + 1)}))).json());
              setClipsPg(clipsPg + 1);
            }}>Next page ({clipsPg + 2})</button>}
          </div>
        </div>}
      </div> : 'Loading...'}
      <h2>Top users</h2>
      <ul style={{ textAlign: 'left' }}>
        {top.map(t => <li key={t.username}>{top.findIndex(t2 => t2.score === t.score) + 1}. <a href={`https://enwp.org/User:${t.username}`}>User:{t.username}</a>, {t.score} points</li>)}
      </ul>
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        {editResult ? (
          <>
            <h2>Edit success! ✔️</h2>
            <p>View your diff here: <code><a target="_blank" href={`https://enwp.org/Special:Diff/${editResult.edit.newrevid}`}>Special:Diff/{editResult.edit.newrevid}</a></code></p>
          </>
        ) : me || import.meta.env.DEV ? (
          <>
            <h2>Confirm edit</h2>
            <ul style={{ textAlign: 'left' }}>
              <li>Reference URL: <code><a target="_blank" href={refUrl}>{refUrl}</a></code></li>
              <li>Changes <span style={{ color: 'blue' }}>highlighted</span> below</li>
              <li>⚠️ You are responsible for any edits made with SIGCOV Hunter</li>
            </ul>
            <textarea ref={wikitextRef} style={{ width: '100%', height: '50vh' }} value={wikitext} onChange={e => setWikitext(e.target.value)} /><br />
            <button onClick={async () => {
              const editResult: EditResult = await (await fetch(SERVER_URL + '/edit', {
                headers: { 'Content-type': 'application/json' },
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify(import.meta.env.DEV ? {
                  title: 'User:Habst/sandbox2',
                  text: wikitext?.replaceAll('Category:', ':Category:'),
                  summary: 'test edit',
                } : {
                  title,
                  text: wikitext,
                }),
              })).json();
              console.log('edit result', editResult);
              if (editResult?.edit?.result === 'Success') {
                setEditResult(editResult);
              }
            }}>Confirm</button>
          </>
        ) : (
          <>
            <h2>Log in 👤</h2>
            <p>You must be logged in to edit and score points.</p>
          </>
        )}
        <button onClick={closeModal}>Close</button>
      </Modal>
    </>
  )
}

export default App
