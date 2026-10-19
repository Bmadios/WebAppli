// Prépa OIQ — appli 100 % statique (aucun serveur, aucune dépendance).
// Routes (hash) :  #/  ·  #/bloc/2  ·  #/bloc/2/cartes?s=2.1  ·  #/bloc/2/quiz?s=2.1

const app = document.getElementById('app');
const crumbs = document.getElementById('crumbs');
const cache = new Map();

/* ---------- Utilitaires ---------- */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

async function getJSON(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path).then((r) => {
      if (!r.ok) throw new Error(`${path} : ${r.status}`);
      return r.json();
    }));
  }
  return cache.get(path);
}

const getBlocs = () => getJSON('data/blocs.json');
async function getBloc(id) {
  const meta = (await getBlocs()).find((b) => String(b.id) === String(id));
  if (!meta) throw new Error(`Bloc ${id} introuvable`);
  return { ...meta, ...(await getJSON(meta.fichier)) };
}

// Progression locale (propre à chaque appareil/navigateur)
const store = {
  get(key, def) {
    try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* stockage indisponible */ }
  },
};
const cardId = (c) => `${c.section}|${c.recto}`;
const knownKey = (blocId) => `oiq:connues:${blocId}`;
const scoreKey = (blocId) => `oiq:quiz:${blocId}`;

function setCrumbs(items) {
  crumbs.innerHTML = items.map(([label, href]) =>
    href ? `<a href="${href}">${esc(label)}</a>` : `<span>${esc(label)}</span>`).join('<span class="sep">›</span>');
}

/* ---------- Accueil ---------- */

async function renderHome() {
  setCrumbs([]);
  const blocs = await Promise.all((await getBlocs()).map((b) => getBloc(b.id)));
  app.innerHTML = `
    <h1>Examen professionnel OIQ</h1>
    <p class="muted">Choisis un bloc pour réviser avec les flash cards ou te tester avec un quiz.</p>
    <div class="grid">
      ${blocs.map((b) => {
        const known = store.get(knownKey(b.id), []).length;
        const best = store.get(scoreKey(b.id), null);
        return `
        <a class="card bloc-card" href="#/bloc/${b.id}" style="--accent:${b.couleur}">
          <span class="badge">Bloc ${b.id}</span>
          <h2>${esc(b.titre)}</h2>
          <p class="muted small">${b.flashcards.length} cartes · ${b.quiz.length} questions</p>
          <div class="progress"><span style="width:${b.flashcards.length ? (100 * known / b.flashcards.length) : 0}%"></span></div>
          <p class="small muted">${known}/${b.flashcards.length} cartes maîtrisées${best ? ` · meilleur quiz : ${best}%` : ''}</p>
        </a>`;
      }).join('')}
    </div>`;
}

/* ---------- Page d'un bloc ---------- */

async function renderBloc(id) {
  const b = await getBloc(id);
  setCrumbs([[`Bloc ${b.id}`]]);
  const count = (list, s) => list.filter((x) => x.section === s).length;
  app.innerHTML = `
    <section style="--accent:${b.couleur}">
      <span class="badge">Bloc ${b.id}</span>
      <h1>${esc(b.titre)}</h1>

      <div class="bloc-layout">
        <div class="panel">
          <label class="field">
            <span class="small muted">Section</span>
            <select id="section">
              <option value="">Toutes les sections</option>
              ${b.sections.map((s) => `<option value="${esc(s.id)}">${esc(s.id)} — ${esc(s.titre)}</option>`).join('')}
            </select>
          </label>

          <div class="actions">
            <a id="go-cards" class="btn btn-primary" href="#/bloc/${b.id}/cartes">Flash cards</a>
            <a id="go-quiz" class="btn" href="#/bloc/${b.id}/quiz">Quiz</a>
          </div>
          <button id="reset" class="btn btn-ghost small">Réinitialiser ma progression pour ce bloc</button>
        </div>

        <div>
          <h2 class="h3">Contenu</h2>
          <ul class="list sections">
            ${b.sections.map((s) => `
              <li><strong>${esc(s.id)}</strong> ${esc(s.titre)}
              <span class="muted small">— ${count(b.flashcards, s.id)} cartes, ${count(b.quiz, s.id)} questions</span></li>`).join('')}
          </ul>
        </div>
      </div>
    </section>`;

  const sel = document.getElementById('section');
  const update = () => {
    const q = sel.value ? `?s=${encodeURIComponent(sel.value)}` : '';
    document.getElementById('go-cards').href = `#/bloc/${b.id}/cartes${q}`;
    document.getElementById('go-quiz').href = `#/bloc/${b.id}/quiz${q}`;
  };
  sel.addEventListener('change', update);
  document.getElementById('reset').addEventListener('click', () => {
    if (confirm('Effacer les cartes maîtrisées et le meilleur score de ce bloc ?')) {
      store.set(knownKey(b.id), []);
      store.set(scoreKey(b.id), null);
    }
  });
}

/* ---------- Flash cards ---------- */

async function renderCards(id, section) {
  const b = await getBloc(id);
  setCrumbs([[`Bloc ${b.id}`, `#/bloc/${b.id}`], ['Flash cards']]);
  const all = b.flashcards.filter((c) => !section || c.section === section);
  if (!all.length) return empty(b, 'Aucune flash card pour cette sélection.');

  let known = new Set(store.get(knownKey(b.id), []));
  let onlyReview = false;
  let deck = shuffle(all);
  let i = 0;

  const draw = () => {
    if (!deck.length) {
      app.innerHTML = `
        <div class="center" style="--accent:${b.couleur}">
          <h1>Bravo !</h1>
          <p>Toutes les cartes de cette sélection sont maîtrisées.</p>
          <div class="actions">
            <button class="btn btn-primary" id="all">Revoir toutes les cartes</button>
            <a class="btn" href="#/bloc/${b.id}">Retour au bloc</a>
          </div>
        </div>`;
      document.getElementById('all').onclick = () => { onlyReview = false; deck = shuffle(all); i = 0; draw(); };
      return;
    }
    const c = deck[i];
    const isKnown = known.has(cardId(c));
    app.innerHTML = `
      <div class="narrow" style="--accent:${b.couleur}">
        <div class="row between small muted">
          <span>Carte ${i + 1} / ${deck.length} · section ${esc(c.section)}</span>
          <label><input type="checkbox" id="review" ${onlyReview ? 'checked' : ''}> À revoir seulement</label>
        </div>
        <button class="flip" id="flip" aria-label="Retourner la carte">
          <div class="flip-inner">
            <div class="face front"><p>${esc(c.recto)}</p><span class="hint"><span class="touch-only">Touche</span><span class="kbd-only">Clique ou appuie sur Espace</span> pour voir la réponse</span></div>
            <div class="face back"><p>${esc(c.verso)}</p></div>
          </div>
        </button>
        <div class="actions">
          <button class="btn" id="prev" ${i === 0 ? 'disabled' : ''}>‹ Préc.</button>
          <button class="btn ${isKnown ? '' : 'btn-primary'}" id="know">${isKnown ? '✓ Maîtrisée' : 'Je la sais'}</button>
          <button class="btn" id="next">Suiv. ›</button>
        </div>
        <p class="center small muted">${known.size} / ${b.flashcards.length} cartes maîtrisées dans le bloc</p>
        <p class="center small muted kbd-only">Clavier : Espace = retourner · ← → = naviguer · M = je la sais</p>
      </div>`;

    const flip = document.getElementById('flip');
    flip.onclick = () => flip.classList.toggle('flipped');
    document.getElementById('prev').onclick = () => { i = Math.max(0, i - 1); draw(); };
    document.getElementById('next').onclick = () => { i = (i + 1) % deck.length; draw(); };
    onKey = (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip.click(); }
      else if (e.key === 'ArrowRight') document.getElementById('next').click();
      else if (e.key === 'ArrowLeft' && i > 0) document.getElementById('prev').click();
      else if (e.key.toLowerCase() === 'm') document.getElementById('know').click();
    };
    document.getElementById('know').onclick = () => {
      const k = cardId(c);
      known.has(k) ? known.delete(k) : known.add(k);
      store.set(knownKey(b.id), [...known]);
      if (onlyReview && known.has(k)) {
        deck.splice(i, 1);
        if (i >= deck.length) i = 0;
      } else {
        i = (i + 1) % deck.length;
      }
      draw();
    };
    document.getElementById('review').onchange = (e) => {
      onlyReview = e.target.checked;
      deck = shuffle(onlyReview ? all.filter((x) => !known.has(cardId(x))) : all);
      i = 0;
      draw();
    };
  };
  draw();
}

/* ---------- Quiz ---------- */

async function renderQuiz(id, section) {
  const b = await getBloc(id);
  setCrumbs([[`Bloc ${b.id}`, `#/bloc/${b.id}`], ['Quiz']]);
  const pool = b.quiz.filter((q) => !section || q.section === section);
  if (!pool.length) return empty(b, 'Aucune question de quiz pour cette sélection.');

  // Mélange questions et choix, en gardant la bonne réponse
  const questions = shuffle(pool).map((q) => {
    const opts = q.choix.map((txt, idx) => ({ txt, ok: idx === q.reponse }));
    const vraiFaux = q.choix.length === 2 && q.choix[0] === 'Vrai';
    return { ...q, opts: vraiFaux ? opts : shuffle(opts) };
  });
  let i = 0;
  let score = 0;
  const errors = [];

  const draw = () => {
    if (i >= questions.length) return finish();
    const q = questions[i];
    app.innerHTML = `
      <div class="narrow" style="--accent:${b.couleur}">
        <div class="row between small muted">
          <span>Question ${i + 1} / ${questions.length} · section ${esc(q.section)}</span>
          <span>Score : ${score}</span>
        </div>
        <div class="progress"><span style="width:${100 * i / questions.length}%"></span></div>
        <h2 class="question">${esc(q.question)}</h2>
        <div class="choices">
          ${q.opts.map((o, k) => `<button class="choice" data-k="${k}"><span class="key kbd-only">${k + 1}</span>${esc(o.txt)}</button>`).join('')}
        </div>
        <div id="feedback"></div>
        <p class="center small muted kbd-only">Clavier : 1 à ${q.opts.length} = répondre · Entrée = question suivante</p>
      </div>`;

    onKey = (e) => {
      const next = document.getElementById('next');
      if (next && (e.key === 'Enter' || e.key === 'ArrowRight')) { e.preventDefault(); next.click(); return; }
      const btn = app.querySelectorAll('.choice')[Number(e.key) - 1];
      if (btn && !btn.disabled) btn.click();
    };

    app.querySelectorAll('.choice').forEach((btn) => {
      btn.onclick = () => {
        const chosen = q.opts[Number(btn.dataset.k)];
        app.querySelectorAll('.choice').forEach((b2, k) => {
          b2.disabled = true;
          if (q.opts[k].ok) b2.classList.add('correct');
        });
        if (chosen.ok) score++;
        else { btn.classList.add('wrong'); errors.push(q); }
        document.getElementById('feedback').innerHTML = `
          <div class="feedback ${chosen.ok ? 'ok' : 'ko'}">
            <strong>${chosen.ok ? 'Bonne réponse !' : 'Mauvaise réponse.'}</strong>
            ${q.explication ? `<p>${esc(q.explication)}</p>` : ''}
          </div>
          <div class="actions"><button class="btn btn-primary" id="next">
            ${i + 1 < questions.length ? 'Question suivante' : 'Voir le résultat'}</button></div>`;
        document.getElementById('next').onclick = () => { i++; draw(); };
        document.getElementById('next').focus();
      };
    });
  };

  const finish = () => {
    const pct = Math.round(100 * score / questions.length);
    const best = store.get(scoreKey(b.id), 0) || 0;
    if (!section && pct > best) store.set(scoreKey(b.id), pct);
    onKey = null;
    app.innerHTML = `
      <div class="narrow" style="--accent:${b.couleur}">
        <div class="center">
          <h1>${pct} %</h1>
          <p>${score} bonne(s) réponse(s) sur ${questions.length}</p>
        </div>
        ${errors.length ? `
          <h2 class="h3">À revoir</h2>
          <ul class="list">${errors.map((q) => `
            <li><strong>${esc(q.question)}</strong><br>
            Réponse : ${esc(q.choix[q.reponse])}
            ${q.explication ? `<br><span class="muted small">${esc(q.explication)}</span>` : ''}</li>`).join('')}
          </ul>` : ''}
        <div class="actions">
          <button class="btn btn-primary" id="again">Recommencer</button>
          <a class="btn" href="#/bloc/${b.id}">Retour au bloc</a>
        </div>
      </div>`;
    document.getElementById('again').onclick = () => renderQuiz(id, section);
  };
  draw();
}

function empty(b, msg) {
  app.innerHTML = `<p>${esc(msg)}</p><a class="btn" href="#/bloc/${b.id}">Retour au bloc</a>`;
}

/* ---------- Raccourcis clavier (PC) ---------- */

// Chaque écran (cartes, quiz) installe son propre gestionnaire ici.
let onKey = null;
document.addEventListener('keydown', (e) => {
  if (!onKey || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest('input, select, textarea')) return;
  // Laisse le navigateur gérer Entrée/Espace sur un bouton qui a le focus (sinon double clic).
  if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('button, a')) return;
  onKey(e);
});

/* ---------- Routeur ---------- */

async function route() {
  onKey = null;
  const [path, qs] = location.hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  const section = new URLSearchParams(qs || '').get('s') || '';
  window.scrollTo(0, 0);
  try {
    if (parts[0] === 'bloc' && parts[1]) {
      if (parts[2] === 'cartes') return await renderCards(parts[1], section);
      if (parts[2] === 'quiz') return await renderQuiz(parts[1], section);
      return await renderBloc(parts[1]);
    }
    return await renderHome();
  } catch (err) {
    console.error(err);
    app.innerHTML = `<p>Impossible de charger le contenu.</p><p class="small muted">${esc(err.message)}</p><a class="btn" href="#/">Accueil</a>`;
  }
}

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
