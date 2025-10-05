(async () => {
  const allow: string[] = [];
  const pid = 'P8286';
  const search = await (await fetch('https://www.wikidata.org/w/api.php?' + new URLSearchParams({
    action: 'query',
    format: 'json',
    list: 'search',
    srsearch: `haswbstatement:${pid}`,
    srlimit: '500',
    origin: '*',
  }))).json();
  const oly: { [id: string]: string } = {};
  const ents: { [qid: string]: {
    claims: {
      [pid: string]: {
        mainsnak: {
          datavalue: {
            value: string
          }
        }
      }[]
    },
    sitelinks: {
      enwiki?: {
        title: string,
      }
    }
  } } = {};
  const wiki: { [id: string]: string } = {};
  const ns: { [id: string]: {
    records: {
      page: {
        id: string
      }
    }[]
  } } = {};
  const ocr: { [id: string]: { text: string } } = {};
  const isOlympian = async (id: string) => {
    oly[id] ??= await (await fetch(`/athletes/${id}`)).text();
    const doc = new DOMParser().parseFromString(oly[id], 'text/html');
    return [...doc.querySelectorAll('small')].some(sm => {
      if (sm.textContent !== '(Olympic)') return false;
      const tr = sm.parentElement?.parentElement;
      if ([...tr?.querySelectorAll('span.label') ?? []].find(span => span.textContent === 'DNS')) return false;
      const table = tr?.parentElement?.parentElement;
      if (table?.previousElementSibling?.textContent !== 'Results') return false;
      return true;
    });
  }
  const getNews = async (title: string) => {
    const [base, dab = ''] = title.split(' (');
    const keyword = `"${base}" ${dab.slice(0, -1)}`.trim();
    ns[keyword] ??= await (await fetch(`https://www.newspapers.com/api/search/query?${new URLSearchParams({
      keyword,
      sort: 'paper-date-asc',
      'entity-types': 'page,obituary,marriage,birth,enslavement',
      count: '100',
    })}`)).json();
    for (const rec of ns[keyword].records) {
      const pgid = rec.page.id;
      if (!ocr[pgid]) {
        const doc = new DOMParser().parseFromString(await (await fetch(`https://www.newspapers.com/newspage/${pgid}`)).text(), 'text/html');
        ocr[pgid] = JSON.parse(doc.querySelector('#mainContent script')?.innerHTML ?? '');
      }
      const idxs = [...ocr[pgid].text.matchAll(new RegExp(base, 'ig'))].map(m => m.index);
      for (const i of idxs) {
        const snip = ocr[pgid].text.slice(i - 200, i + base.length + 200).replaceAll(new RegExp(base, 'ig'), `**${base}**`);
        console.log('found match:', `...${snip}...`);
      }
      break;
    }
  }
  for (const searchObj of search.query.search.toReversed()) {
    const qid = searchObj.title;
    ents[qid] ??= (await (await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`)).json()).entities[qid];
    const oid = ents[qid].claims[pid][0].mainsnak.datavalue.value;
    if (!await isOlympian(oid)) continue;
    console.log('olympian', qid, oid, searchObj.snippet.replaceAll('\n', ';'));
    const enwiki = ents[qid].sitelinks?.enwiki?.title;
    if (!enwiki) {
      console.log('no enwiki'); break;
    }
    wiki[enwiki] ??= (await (await fetch('https://en.wikipedia.org/w/api.php?' + new URLSearchParams({
      // don't follow redirects
      origin: '*',
      action: 'parse',
      page: enwiki,
      format: 'json',
      prop: 'text',
      formatversion: '2',
    }))).json()).parse.text;
    const nonSigcov = [
      'tas-cas.org',
      'procyclingstats.com',
      'olympics.com/tokyo-2020/olympic-games/en/results',
      'olympics.com/en/athletes',
      'wikidata.org',
      'commons.wikimedia.org',
      'olympedia.org',
      'resultados.as.com',
      'cqranking.com',
      'cyclingarchives.com',
      'uci.org/rider-details',
      'cyclebase.nl',
      'wikisource.org',
      'd-nb.info',
      'dbn.bn.org.pl',
      'sports-reference.com',
    ];
    const doc = new DOMParser().parseFromString(wiki[enwiki], 'text/html');
    const urls = [...doc.querySelectorAll('.references a[href]')].map(a => a.getAttribute('href')).filter(url => !nonSigcov.some(ns => url?.includes(ns)));
    if (allow.includes(enwiki)) continue;
    // const push = () => allow.push(enwiki);
    if (urls.length) {
      console.log(urls.sort());
      console.log('Looks okay, but not on allow list:', enwiki);
      break;
    } else {
      console.log('Lacking SIGCOV', enwiki);
      await getNews(enwiki);
      break;
    }
    break;
  }
})()