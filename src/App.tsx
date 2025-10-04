import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [source, setSource] = useState<string>('billedmammal');
  const [titles, setTitles] = useState<string[]>([]);

  const [title, setTitle] = useState<string>('');
  const [artHtml, setArtHtml] = useState<string>('');

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
        
        setArtHtml(r.parse.text);
      }
    })();
  }, [title]);

  return (
    <>
      <h1><a href="https://enwp.org/WP:SIGCOV">WP:SIGCOV</a> Hunter 🎯</h1>
      <label htmlFor="source">Source: </label>
      <select name="source">
        <option value="billedmammal">BilledMammal list</option>
      </select><br />
      {titles.length ? <div>
        <button onClick={async () => {
          const rndTitle = titles[Math.floor(Math.random() * titles.length)];
          setTitle(rndTitle);
        }}>Get Un(der)referenced Article 📝</button>
        <h1>{title}</h1>
        <div className="article" dangerouslySetInnerHTML={{ __html: artHtml }} />
      </div> : 'Loading...'}
    </>
  )
}

export default App
