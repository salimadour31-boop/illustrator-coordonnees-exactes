// DOM Illustrator + ScriptUI simulés (sous-ensemble utilisé par CoordonneesExactes) / simulated Illustrator DOM + ScriptUI (subset used)
'use strict';
global.DocumentColorSpace = { RGB: 'RGB', CMYK: 'CMYK' };
global.RGBColor = function () { this.typename = 'RGBColor'; };
global.CMYKColor = function () { this.typename = 'CMYKColor'; };
global.alerts = []; global.alert = m => global.alerts.push(String(m));
global.Folder = { userData: '/tmp' };
global.files = {};
global.File = function (p) { this.fsName = p; this.exists = !!global.files[p]; };
global.File.prototype.open = function () { return true; };
global.File.prototype.read = function () { return global.files[this.fsName] || ''; };
global.File.prototype.write = function (t) { global.files[this.fsName] = t; global.lastWrite = t; };
global.File.prototype.close = function () {};
global.File.saveDialog = () => global.saveTarget ? new global.File(global.saveTarget) : null;

// Histoire : tableau de caractères {c, a} (a = attributs) / story: array of characters {c, a}
class Story {
  constructor(text, attrs) { this.chars = [...text].map((c, i) => ({ c, a: attrs ? attrs(i, c) : { id: i } })); this.textFrames = []; this.edits = 0; const S = this;
    this.textRange = { get contents() { return S.chars.map(x => x.c).join(''); }, get characters() { return S.chars.map((x, i) => S.charObj(i)); } };
    this.width = 0; }
  // Lignes composées : retour à la ligne glouton à « width » caractères, jamais sur un espace insécable (noBreak)
  // Composed lines: greedy wrap at "width" characters, never at a no-break space (noBreak)
  get lines() {
    const out = []; let cur = '', lastOpp = -1, i = 0; const C = this.chars;
    const flush = n => { out.push({ contents: cur.slice(0, n) }); cur = cur.slice(n); };
    for (i = 0; i < C.length; i++) {
      const ch = C[i].c;
      if (ch === '\r') { out.push({ contents: cur + ch }); cur = ''; lastOpp = -1; continue; }
      cur += ch;
      if (ch === ' ' && !C[i].a.noBreak && !(C[i + 1] && C[i + 1].a.noBreak && C[i - 1] && C[i - 1].a.noBreak)) lastOpp = cur.length;
      if (this.width && cur.length > this.width && lastOpp > 0) { flush(lastOpp); lastOpp = -1; for (let k = 0; k < cur.length; k++) if (cur[k] === ' ') lastOpp = k + 1; }
    }
    if (cur.length) out.push({ contents: cur });
    return out;
  }
  charObj(i) { const S = this; return { get contents() { return S.chars[i].c; },
    set contents(v) { S.edits++; const a = S.chars[i].a; const arr = [...String(v)].map(c => ({ c, a })); S.chars.splice(i, 1, ...arr); },
    remove() { S.edits++; S.chars.splice(i, 1); }, get characterAttributes() { return S.chars[i].a; } }; }
}
class TextFrame {
  constructor(story, bb) { this.typename = 'TextFrame'; this.story = story; story.textFrames.push(this); this.bb = bb; this.hidden = false; this.locked = false; this.textRange = { characterAttributes: {} }; this._own = null; }
  get contents() { return this._own !== null ? this._own : this.story.textRange.contents; }
  set contents(v) { this._own = v; }
  get geometricBounds() { return [this.bb.l, this.bb.t, this.bb.r, this.bb.b]; }
  set position(p) { this.pos = p; } get position() { return this.pos; }
  remove() { const a = this.parent.pageItems; a.splice(a.indexOf(this), 1); }
}
class PathItem { constructor(kind, args) { this.typename = 'PathItem'; this.kind = kind; this.args = args; } remove() { const a = this.parent.pageItems; a.splice(a.indexOf(this), 1); } }
class Layer {
  constructor(name, doc) {
    this.typename = 'Layer'; this.name = name; this.visible = true; this.locked = false; this.printable = true; this.pageItems = []; this.parent = doc; const L = this;
    const put = it => { it.parent = L; it.layer = L; L.pageItems.push(it); return it; };
    this.pathItems = { rectangle: (...a) => put(new PathItem('rect', a)), ellipse: (...a) => put(new PathItem('ellipse', a)) };
    this.textFrames = { add: () => { const t = new TextFrame(new Story(''), { l: 0, r: 0, t: 0, b: 0 }); return put(t); } };
  }
  remove() { const a = this.parent.layers; a.splice(a.indexOf(this), 1); }
}
// items : [{text | story, bb, layer?, hidden?, locked?, attrs?}] ; artboards : [{rect, name}]
function mkDoc(items, artboards) {
  const doc = { typename: 'Document', documentColorSpace: 'CMYK', layers: [], _sel: [] };
  const main = new Layer('Calque 1', doc); doc.layers.push(main);
  const hiddenL = new Layer('Masqué', doc); hiddenL.visible = false; doc.layers.push(hiddenL);
  doc.layers.getByName = n => { const L = doc.layers.find(x => x.name === n); if (!L) throw new Error('No such layer'); return L; };
  doc.layers.add = () => { const L = new Layer('Calque', doc); doc.layers.unshift(L); return L; };
  const frames = items.map(it => { const st = it.story || new Story(it.text, it.attrs); if (it.width) st.width = it.width; const tf = new TextFrame(st, it.bb); const L = it.layer === 'hidden' ? hiddenL : main; tf.parent = L; tf.layer = L; L.pageItems.push(tf); tf.hidden = !!it.hidden; tf.locked = !!it.locked; return tf; });
  Object.defineProperty(doc, 'textFrames', { get() { const out = []; doc.layers.forEach(L => L.pageItems.forEach(p => { if (p.typename === 'TextFrame') out.push(p); })); return out; } });
  const abs = (artboards || [{ rect: [-10000, 10000, 10000, -10000], name: 'Plan de travail 1' }]).map(a => ({ artboardRect: a.rect, name: a.name }));
  abs.getActiveArtboardIndex = () => doc.activeAb || 0; doc.artboards = abs;
  Object.defineProperty(doc, 'selection', { get() { return doc._sel; }, set(v) { doc._sel = v ? v : []; } });
  doc.frames = frames;
  return doc;
}
// ScriptUI simulé : show() appelle le scénario du test / simulated ScriptUI: show() calls the test scenario
global.uiLog = [];
class Ctl {
  constructor(type, text, props) { this.type = type; this.text = text; this.props = props || {}; this.children = []; this.value = false; this.enabled = true; this.items = []; }
  removeAll() { this.items = []; }
  add(type, b, text, props) {
    let c;
    if (type === 'dropdownlist') { c = new Ctl(type, ''); c.list = text; Object.defineProperty(c, 'selection', { get() { return c._s; }, set(v) { c._s = typeof v === 'number' ? { index: v } : v; } }); c.selection = 0; }
    else if (type === 'item') { const it = { text: b, subItems: [0, 1, 2, 3, 4, 5].map(() => ({ text: '' })) }; this.items.push(it); return it; }
    else { c = new Ctl(type, text, props); }
    this.children.push(c); global.uiLog.push(c); return c;
  }
}
class Window extends Ctl { constructor(type, title) { super('window', title); global.uiLog = []; this.closed = null; } show() { global.uiScenario(this, global.uiLog); return this.closed; } close(v) { this.closed = v; } }
global.Window = Window;
function find(log, re, type) { return log.find(c => (!type || c.type === type) && re.test(String(c.text))); }
module.exports = { Story, TextFrame, Layer, mkDoc, find };
