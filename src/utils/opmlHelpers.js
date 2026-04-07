/**
 * YANA OPML Engineering
 * 
 * Logic to parse and generate OPML (Outline Processor Markup Language)
 * for RSS subscription management.
 */

export const parseOPML = (xmlString) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  const outlines = xmlDoc.querySelectorAll('outline[xmlUrl]');
  
  return Array.from(outlines).map(node => ({
    id: Math.random().toString(36).substr(2, 9),
    url: node.getAttribute('xmlUrl'),
    name: node.getAttribute('title') || node.getAttribute('text') || 'Untitled Feed',
    category: node.parentElement?.getAttribute('title') || node.parentElement?.getAttribute('text') || 'General'
  }));
};

export const generateOPML = (feeds) => {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head>
    <title>YANA Subscriptions</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>
    <outline title="Feeds" text="Feeds">`;
  
  const items = feeds.map(f => {
    const safeName = (f.name || 'Untitled').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":"&apos;"}[c]));
    return `      <outline type="rss" text="${safeName}" title="${safeName}" xmlUrl="${f.url}" />`;
  }).join('\n');

  const footer = `    </outline>
  </body>
</opml>`;

  return `${header}\n${items}\n${footer}`;
};
