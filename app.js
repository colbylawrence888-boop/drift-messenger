
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm';

const SUPABASE_URL = 'https://dcsvrutsygfchxawlptm.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_rXnC31tjWQQH-PVvCMVy0g_xQsdqtex';
const sb = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
const root = document.getElementById('root');
const toastArea = document.getElementById('toast');
const state = {
  authMode: 'signin', user: null, profile: null, view: 'chats',
  chats: [], messages: [], friends: [], requests: [], blocks: [], active: null,
  selected: null, modal: null, searchResults: [], chatFilter: '', query: '',
  friendSearch: [], pendingProfile: null, draft: '',
  channels: [], olderCursor: null, busy: false
};
const COLORS = { violet: '#7967e8', teal: '#28b8ac', rose: '#e877a3', sky: '#57b1e4' };
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const $ = (selector, node = document) => node.querySelector(selector);
function note(text) {
  toastArea.innerHTML = '<div class="toast-msg">' + esc(text) + '</div>';
  clearTimeout(note.timeout);
  note.timeout = setTimeout(() => { toastArea.innerHTML = ''; }, 4400);
}
const initial = str => esc((str || '?').trim().charAt(0).toUpperCase());
const avatar = (p, size = 43) => '<span class="avatar" style="height:' + size + 'px;width:' + size + 'px;font-size:' + Math.floor(size / 2.6) + 'px">' + (p?.signedUrl ? '<img src="' + esc(p.signedUrl) + '" alt="">' : initial(p?.display_name)) + '</span>';
const iconPaths = {
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8.5 11.5h7"/>',
  friends: '<path d="M16 20v-1.8a4.2 4.2 0 0 0-4.2-4.2H6.2A4.2 4.2 0 0 0 2 18.2V20"/><circle cx="9" cy="6.5" r="3.5"/><path d="M22 20v-1.8a4.2 4.2 0 0 0-3.1-4M16 3.2a3.5 3.5 0 0 1 0 6.7"/>',
  settings: '<path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"/><path d="m19.4 13.8 1.2 1-.9 2.1-1.6-.1-1.4 1.4.1 1.6-2.1.9-1-1.2h-2l-1 1.2-2.1-.9.1-1.6-1.4-1.4-1.6.1-.9-2.1 1.2-1v-2l-1.2-1 .9-2.1 1.6.1 1.4-1.4-.1-1.6 2.1-.9 1 1.2h2l1-1.2 2.1.9-.1 1.6 1.4 1.4 1.6-.1.9 2.1-1.2 1v2Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  arrow: '<path d="m5 12 14 0m-6-6 6 6-6 6"/>',
  back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  send: '<path d="m21 3-9.5 18-2.3-8.2L1 10.5 21 3Z"/><path d="M9.2 12.8 21 3"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  group: '<rect x="3" y="4" width="18" height="16" rx="4"/><path d="M7 10h10M7 14h7"/>',
  spark: '<path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2L12 2Z"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  userplus: '<path d="M16 20v-2.4a4.6 4.6 0 0 0-4.6-4.6H7.6A4.6 4.6 0 0 0 3 17.6V20"/><circle cx="9.5" cy="6.5" r="3.5"/><path d="M20 7v7m-3.5-3.5h7"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'
};
const ico = (name, size = 20) => '<svg class="ui-icon" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (iconPaths[name] || iconPaths.chat) + '</svg>';
const brand = (compact = false) => '<span class="brand"><span class="logo">' + ico('chat', 22) + '</span>' + (compact ? '' : '<b>drift<span class="brand-period">.</span></b>') + '</span>';
function timeLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return 'Now';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h';
  if (diff < 604800000) return Math.floor(diff/86400000) + 'd';
  return date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}
const busyText = value => state.busy ? 'Working...' : value;
function withBusy(task) {
  if (state.busy) return;
  state.busy = true;
  return Promise.resolve().then(task).catch(e => note(e?.message || String(e))).finally(() => { state.busy = false; });
}
function requireOk(res) { if (res.error) throw res.error; return res.data; }
async function getProfiles(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];
  return requireOk(await sb.from('profiles').select('id,username,display_name,avatar_url,bio,accent').in('id', unique));
}
async function decorated(p) {
  if (!p) return null;
  if (p.avatar_url) {
    const signed = await sb.storage.from('avatars').createSignedUrl(p.avatar_url, 3600);
    if (!signed.error) return { ...p, signedUrl: signed.data.signedUrl };
  }
  return p;
}
function authScreen() {
  const m = state.authMode;
  const title = m === 'signup' ? 'Create your account' : m === 'forgot' ? 'Reset your password' : m === 'reset' ? 'Choose a new password' : 'Welcome back.';
  const subtitle = m === 'signup' ? 'A better way to stay close to your circle.' : m === 'forgot' ? "We'll send a password reset link to your inbox." : m === 'reset' ? 'Pick a new password for your DRIFT account.' : 'Pick up right where you left off.';
  const actionText = m === 'signup' ? 'Create account' : m === 'forgot' ? 'Send reset link' : m === 'reset' ? 'Save password' : 'Sign in to DRIFT';
  root.innerHTML = '<main class="auth-screen"><div class="auth-layout">' +
    '<aside class="auth-showcase">' +
      '<div class="auth-brand">' + brand() + '<span class="auth-edition">PRIVATE MESSAGING</span></div>' +
      '<div class="showcase-center">' +
        '<span class="hero-kicker"><i></i> A SPACE FOR YOUR PEOPLE</span>' +
        '<h2>Good conversations.<br/><em>Better connections.</em></h2>' +
        '<p>All your favorite people, one beautiful place. No endless feeds. Just real conversations.</p>' +
        '<div class="showcase-visual">' +
          '<div class="orbit-ring ring-one"></div><div class="orbit-ring ring-two"></div><div class="orbit-ring ring-three"></div>' +
          '<div class="float-avatar fa-one">A</div><div class="float-avatar fa-two">J</div><div class="float-avatar fa-three">M</div>' +
          '<div class="visual-panel"><div class="visual-panel-head"><span class="visual-mark">' + ico('chat',20) + '</span><span><strong>Your circle</strong><small>Always connected</small></span><span class="visual-pulse"></span></div>' +
            '<div class="visual-message"><span class="visual-dot"></span><span class="visual-lines"><i></i><i></i></span></div>' +
            '<div class="visual-message own"><span class="visual-lines"><i></i><i></i></span></div>' +
            '<div class="visual-message"><span class="visual-dot accent"></span><span class="visual-lines"><i></i><i></i></span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="auth-showcase-foot"><span>' + ico('shield',16) + ' Private by design</span><span>Made for real friendships.</span></div>' +
    '</aside>' +
    '<section class="auth-box"><div class="auth-form-top"><span class="form-brand-mobile">' + brand() + '</span><span class="form-eyebrow">' + (m === 'signin' ? 'YOUR SPACE AWAITS' : 'DRIFT ACCOUNT') + '</span><h1>' + title + '</h1><p>' + subtitle + '</p></div>' +
    '<form id="auth-form" class="form-grid">' +
      (m === 'signup' ? '<label>Username<input name="username" required autocomplete="username" pattern="[a-z0-9_]{3,20}" minlength="3" maxlength="20" placeholder="choose_a_username"></label><label>Display name<input name="display" maxlength="40" placeholder="What should we call you?"></label>' : '') +
      (m === 'reset' ? '' : '<label>Email address<input name="email" type="email" autocomplete="email" placeholder="you@example.com" required></label>') +
      (m === 'forgot' ? '' : '<label>' + (m === 'reset' ? 'New password' : 'Password') + '<input type="password" name="password" minlength="8" autocomplete="' + (m === 'signin' ? 'current-password' : 'new-password') + '" required placeholder="Enter your password"></label>') +
      '<button class="primary auth-submit full" type="submit"><span>' + actionText + '</span>' + ico('arrow',18) + '</button></form>' +
    '<div class="auth-links">' + (m === 'signin' ? '<button class="link-btn" data-auth="forgot">Forgot password?</button><span>New to DRIFT? <button class="link-btn inline-link" data-auth="signup">Create an account</button></span>' : '<button class="link-btn" data-auth="signin">' + ico('back',15) + ' Back to sign in</button>') + '</div>' +
    '<div class="auth-warning">' + ico('lock',15) + '<span>Your conversations stay private to their members. DRIFT uses secure account sign-in.</span></div>' +
    '<div class="auth-legal">DRIFT <span>•</span> Your people. Your conversations.</div></section></div></main>';
  $('#auth-form').addEventListener('submit', handleAuth);
  root.querySelectorAll('[data-auth]').forEach(btn => btn.addEventListener('click', () => { state.authMode = btn.dataset.auth; authScreen(); }));
  const passwordInput = $('#auth-form input[type="password"]');
  if (passwordInput) {
    const show = document.createElement('button');
    show.type = 'button';
    show.className = 'password-toggle';
    show.textContent = 'Show';
    show.addEventListener('click', () => {
      passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
      show.textContent = passwordInput.type === 'password' ? 'Show' : 'Hide';
    });
    passwordInput.closest('label').appendChild(show);
  }
}
async function handleAuth(e) {
  e.preventDefault();
  const mode = state.authMode;
  const form = new FormData(e.currentTarget);
  const email = String(form.get('email') || '').trim();
  const password = String(form.get('password') || '');
  await withBusy(async () => {
    if (mode === 'signin') {
      try {
        requireOk(await sb.auth.signInWithPassword({ email, password }));
      } catch (loginError) {
        if (loginError?.code === 'email_not_confirmed' || /email not confirmed/i.test(loginError?.message || '')) {
          throw new Error('This account is awaiting confirmation from the email provider. Please contact the site owner.');
        }
        if (/invalid login credentials/i.test(loginError?.message || '')) {
          throw new Error('Email or password not recognized. Check your details or use Forgot password.');
        }
        throw loginError;
      }
      await startSignedIn();
    } else if (mode === 'signup') {
      const username = String(form.get('username')).trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(username)) throw new Error('Username must be 3–20 letters, numbers or underscores');
      const created = requireOk(await sb.auth.signUp({ email, password, options: {
        data: { username, display_name: String(form.get('display') || username) }
      } }));
      if (created.session) {
        await startSignedIn();
        note('Account created and signed in.');
      } else {
        state.authMode = 'signin';
        authScreen();
        note('Account created. Your email provider currently requires confirmation before sign-in.');
      }
    } else if (mode === 'forgot') {
      requireOk(await sb.auth.resetPasswordForEmail(email));
      note('If that address has an account, check its inbox for a reset link.');
      state.authMode = 'signin'; authScreen();
    } else if (mode === 'reset') {
      requireOk(await sb.auth.updateUser({ password }));
      note('Password updated.'); state.authMode = 'signin';
      await startSignedIn();
    }
  });
}
let startingSignIn = null;
async function startSignedIn() {
  if (startingSignIn) return startingSignIn;
  startingSignIn = (async () => {
    const { data: { user }, error } = await sb.auth.getUser();
    if (error) throw error;
    if (!user) { state.user = null; state.profile = null; authScreen(); return; }
    state.user = user;
    let p = requireOk(await sb.from('profiles').select('*').eq('id', user.id).maybeSingle());
    if (!p) {
      await new Promise(resolve => setTimeout(resolve, 600));
      p = requireOk(await sb.from('profiles').select('*').eq('id', user.id).maybeSingle());
    }
    if (!p) {
      state.profile = null;
      root.innerHTML = '<div class="auth-screen"><div class="auth-box"><h1>Account needs setup</h1><p>Sign-in worked but DRIFT could not load your profile. Try reloading or ask the site owner to repair the profile record.</p><button class="primary" onclick="location.reload()">Retry</button><button class="ghost" style="margin-top:12px" id="recovery-signout">Sign out</button></div></div>';
      $('#recovery-signout')?.addEventListener('click', async () => { await sb.auth.signOut(); state.user = null; state.profile = null; authScreen(); });
      note('Signed in, but profile could not be loaded.');
      return;
    }
    state.profile = await decorated(p);
    // Display signed-in UI before optional chats load, so a chat error doesn't look like a failed login.
    render();
    try { await refreshAll(); render(); }
    catch (loadError) {
      console.error('DRIFT chat loading failed after successful sign-in', loadError);
      note('Sign-in worked. Chats could not load: ' + (loadError?.message || 'please refresh'));
    }
    openRealtime();
  })();
  try { return await startingSignIn; }
  finally { startingSignIn = null; }
}
async function refreshAll() {
  if (!state.user) return;
  const [c, fr, rq, bl] = await Promise.all([
    sb.rpc('list_conversations'),
    sb.from('friendships').select('user_a,user_b,created_at'),
    sb.from('friend_requests').select('id,requester_id,recipient_id,created_at,status').eq('status','pending').order('created_at', {ascending:false}),
    sb.from('blocks').select('blocked_id,created_at')
  ]);
  state.chats = requireOk(c) || [];
  const fRows = requireOk(fr) || [];
  const rRows = requireOk(rq) || [];
  const bRows = requireOk(bl) || [];
  const ids = [
    ...fRows.map(f => f.user_a === state.user.id ? f.user_b : f.user_a),
    ...rRows.map(f => f.requester_id === state.user.id ? f.recipient_id : f.requester_id),
    ...bRows.map(b => b.blocked_id)
  ];
  const profiles = await getProfiles(ids);
  const map = Object.fromEntries(profiles.map(p => [p.id,p]));
  state.friends = fRows.map(f => ({ ...f, other: map[f.user_a === state.user.id ? f.user_b : f.user_a] })).filter(f=>f.other);
  state.requests = rRows.map(f => ({ ...f, other: map[f.requester_id === state.user.id ? f.recipient_id : f.requester_id], direction: f.requester_id === state.user.id ? 'out' : 'in' })).filter(f=>f.other);
  state.blocks = bRows.map(b => ({ ...b, other: map[b.blocked_id] })).filter(b=>b.other);
}
function closeRealtime() {
  state.channels.forEach(ch => sb.removeChannel(ch));
  state.channels = [];
}
function openRealtime() {
  closeRealtime();
  if (!state.user) return;
  const me = state.user.id;
  const channel = sb.channel('drift-social-' + me)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: 'recipient_id=eq.' + me }, async () => { await refreshAll(); render(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_members', filter: 'member_id=eq.' + me }, async () => { await refreshAll(); render(); })
    .subscribe();
  state.channels.push(channel);
  const messages = sb.channel('drift-messages-' + me)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async payload => {
      if (state.active && payload.new?.conversation_id === state.active) {
        await loadMessages(); render();
      }
      await refreshAll(); render();
    }).subscribe();
  state.channels.push(messages);
}
async function loadMessages(before) {
  if (!state.active) return;
  let q = sb.from('messages').select('id,conversation_id,sender_id,body,created_at,deleted_at')
    .eq('conversation_id',state.active).order('created_at',{ascending:false}).limit(60);
  if (before) q = q.lt('created_at',before);
  const page = requireOk(await q);
  state.messages = before ? [...page.reverse(),...state.messages] : page.reverse();
  state.olderCursor = page.length === 60 ? page[0].created_at : null;
  if (!before) await sb.rpc('mark_read',{_conv:state.active});
}
async function chooseChat(id) {
  state.active = id;
  state.view = 'chats';
  state.messages = []; state.olderCursor = null;
  render();
  await withBusy(async () => { await loadMessages(); render(); scrollBottom(); });
}
function scrollBottom() { setTimeout(() => { const log = $('#chat-log'); if(log)log.scrollTop=log.scrollHeight; }, 20); }
function labelFor(c) { return c.type === 'direct' ? c.other_display_name || c.other_username || 'Friend' : c.title || 'Group'; }
function nav() {
  const items = [
    ['chats','chat','Chats'],
    ['friends','friends','Friends'],
    ['settings','settings','Settings']
  ];
  return '<nav class="rail" aria-label="Main navigation">' +
    '<div class="rail-brand">' + brand(true) + '</div>' +
    '<div class="railnav">' + items.map(item => '<button class="nav-btn ' + (state.view === item[0] ? 'active' : '') + '" title="' + item[2] + '" data-view="' + item[0] + '">' + ico(item[1],21) + '<span>' + item[2] + '</span>' +
      (item[0] === 'friends' && state.requests.some(r=>r.direction === 'in') ? '<i class="nav-dot"></i>' : '') + '</button>').join('') + '</div>' +
    '<div class="rail-bottom"><span class="rail-status" title="Signed in"></span>' + avatar(state.profile,38) + '</div></nav>';
}
function sidebar() {
  const filtered = state.chats.filter(c => labelFor(c).toLowerCase().includes(state.chatFilter.toLowerCase()));
  const unreadTotal = state.chats.reduce((sum,c) => sum + Number(c.unread || 0),0);
  const username = state.profile?.display_name || 'You';
  return '<aside class="sidebar">' +
    '<div class="side-heading"><div class="eyebrow">YOUR INBOX</div><div class="side-title-line"><h2>Messages</h2>' + (unreadTotal ? '<span class="total-unread">' + unreadTotal + '</span>' : '') + '</div><p>Stay close. Stay connected.</p></div>' +
    '<div class="side-actions"><button class="side-create" data-action="newgroup" title="Create a new group">' + ico('plus',18) + '<span>New group</span></button></div>' +
    '<form class="field-search" id="search-chats">' + ico('search',18) + '<input name="q" placeholder="Search conversations" value="' + esc(state.chatFilter) + '" aria-label="Search conversations or messages"><button class="search-go" title="Search message text" aria-label="Search message text">' + ico('arrow',17) + '</button></form>' +
    '<div class="list-body"><div class="list-caption"><span>' + (state.searchResults.length?'MESSAGE RESULTS':'RECENT CHATS') + '</span><span>' + (state.searchResults.length||filtered.length) + '</span></div>' +
    (state.searchResults.length ? state.searchResults.map(m => '<button class="chat-item search-result" data-chat="' + esc(m.conversation_id) + '"><span class="row-avatar group">' + ico('search',17) + '</span><span class="chat-copy"><b>' + esc(m.conv_title || m.sender_display_name || 'Message') + '</b><small>' + esc(m.body) + '</small></span>' + ico('arrow',14) + '</button>').join('') :
      filtered.map(c => '<button class="chat-item ' + (state.active === c.id ? 'selected':'') + '" data-chat="' + esc(c.id) + '">' +
        '<span class="row-avatar ' + (c.type==='group'?'group':'') + '">' + (c.type==='group'?ico('friends',19):initial(c.other_display_name)) + '</span>' +
        '<span class="chat-copy"><b>' + esc(labelFor(c)) + '</b><small>' + esc(c.last_body || (c.type === 'group' ? c.member_count + ' members' : 'Start a conversation')) + '</small></span>' +
        '<span class="chat-end"><span class="time">' + timeLabel(c.last_message_at) + '</span>' + (Number(c.unread) > 0 ? '<span class="unread">' + Math.min(99,Number(c.unread)) + '</span>' : '') + '</span></button>').join('')) +
    (!filtered.length && !state.searchResults.length ? '<div class="sidebar-empty"><span class="empty-orb">' + ico('chat',25) + '</span><h3>It starts with hello.</h3><p>Find a friend and your conversations will appear here.</p><button class="ghost" data-view="friends">' + ico('userplus',16) + ' Add a friend</button></div>' : '') +
    '</div><div class="sidebar-account"><span class="account-avatar">' + avatar(state.profile,37) + '</span><span class="account-copy"><b>' + esc(username) + '</b><small>@' + esc(state.profile?.username || '') + '</small></span><button class="icon-btn" data-view="settings" title="Your settings">' + ico('settings',18) + '</button></div></aside>';
}
function chatPane() {
  if (!state.active) return '<section class="chat-space"><div class="chat-empty">' +
    '<div class="empty-scene"><div class="scene-grid"></div><div class="scene-ring scene-ring-a"></div><div class="scene-ring scene-ring-b"></div><span class="scene-center">' + ico('chat',38) + '</span><div class="scene-avatar scene-a">A</div><div class="scene-avatar scene-b">J</div><div class="scene-avatar scene-c">M</div></div>' +
    '<span class="eyebrow welcome-eyebrow">GOOD TO HAVE YOU HERE</span><h2>Conversations start here<span class="heading-dot">.</span></h2><p>Pick a conversation from the left, or add someone you know to start something new.</p><button class="primary" data-view="friends">' + ico('userplus',18) + ' Find your people</button>' +
    '<div class="welcome-foot">' + ico('lock',15) + ' Only you and your friends can see your chats</div></div></section>';
  const c = state.chats.find(c=>c.id===state.active);
  if (!c) { state.active=null;return chatPane(); }
  return '<section class="chat-space">' +
    '<header class="chat-header"><button class="icon-btn mobile-back" data-action="back" aria-label="Back to conversations">' + ico('back',20) + '</button>' +
      '<span class="row-avatar chat-person ' + (c.type==='group'?'group':'') + '">' + (c.type==='group'?ico('friends',21):initial(c.other_display_name)) + '</span>' +
      '<div class="identity"><b>' + esc(labelFor(c)) + '</b><small>' + (c.type==='group'?ico('friends',12) + ' Group · ' + Number(c.member_count) + ' members':ico('lock',12) + ' Private conversation') + '</small></div>' +
      '<span class="chat-private">' + ico('shield',14) + ' Private</span><button class="icon-btn header-more" title="Conversation details" data-action="details">' + ico('more',21) + '</button></header>' +
    '<div class="chat-log" id="chat-log"><div class="chat-log-content">' +
      (state.olderCursor ? '<div class="older-container"><button class="ghost" data-action="older">Load older messages</button></div>' : '') +
      (!state.messages.length ? '<div class="conversation-empty"><span class="convo-empty-icon">' + ico('spark',28) + '</span><h3>A little hello goes a long way.</h3><p>You are at the beginning of this conversation. Send the first message.</p></div>' : '') +
      state.messages.map((m,index) => {
        const mine = m.sender_id === state.user.id;
        const currentDay = new Date(m.created_at).toDateString();
        const previousDay = index ? new Date(state.messages[index-1].created_at).toDateString() : '';
        const daySeparator = currentDay !== previousDay ? '<div class="date-separator"><span>' + esc(new Date(m.created_at).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})) + '</span></div>' : '';
        return daySeparator + '<div class="chat-row ' + (mine?'mine':'theirs') + '"><div class="bubble-wrap"><div class="bubble">' + (m.deleted_at?'<i>Message deleted</i>':esc(m.body)) + '</div><div class="meta">' +
          new Date(m.created_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}) + '</div></div></div>';
      }).join('') + '</div></div>' +
    '<div class="composer"><form id="message-form"><span class="compose-symbol">' + ico('chat',20) + '</span><input name="body" autocomplete="off" maxlength="4000" placeholder="Write a message..." aria-label="Write a message" value="' + esc(state.draft) + '"><button class="send-button" type="submit" title="Send message" aria-label="Send message">' + ico('arrow',21) + '</button></form>' +
      '<div class="compose-note">' + ico('lock',12) + ' Visible only to chat members · Not end-to-end encrypted</div></div></section>';
}
function friendsPane() {
  const incoming = state.requests.filter(r=>r.direction==='in');
  return '<section class="chat-space"><div class="page friends-page">' +
    '<header class="page-hero"><div><span class="eyebrow">YOUR INNER CIRCLE</span><h1>People<span class="heading-dot">.</span></h1><p>Real friends, real conversations. Build your circle one person at a time.</p></div><span class="page-hero-icon">' + ico('friends',35) + '</span></header>' +
    '<div class="stat-strip"><div class="stat-cell"><b>' + state.friends.length + '</b><span>Friends</span></div><div class="stat-cell"><b>' + incoming.length + '</b><span>Incoming requests</span></div><div class="stat-cell"><b>' + state.requests.filter(r=>r.direction==='out').length + '</b><span>Sent requests</span></div></div>' +
    '<div class="cards"><section class="card add-friend-card"><div class="card-title"><span class="card-icon">' + ico('userplus',19) + '</span><div><h3>Find your people</h3><p>Search by username to connect.</p></div></div>' +
      '<form id="find-user-form" class="add-form"><input name="username" placeholder="Enter a username" required autocomplete="off"><button class="primary" type="submit">' + ico('search',17) + ' Search</button></form>' +
      (state.friendSearch.length?'<div class="found-list">' + state.friendSearch.map(p => '<div class="row">' + avatar(p) + '<div class="row-main"><b>' + esc(p.display_name) + '</b><small>@'+esc(p.username)+'</small></div><button class="mini" data-add="'+esc(p.username)+'">' + ico('plus',15) + ' Add</button></div>').join('') + '</div>' : '') +
    '</section><section class="card requests-card"><div class="card-title"><span class="card-icon alt">' + ico('chat',19) + '</span><div><h3>Friend requests <span class="pill">' + incoming.length + '</span></h3><p>People who want to connect.</p></div></div>' +
    (!state.requests.length ? '<div class="small-empty">' + ico('check',18) + ' All caught up. No pending requests.</div>' : '') +
    state.requests.map(r => '<div class="row">' + avatar(r.other) + '<div class="row-main"><b>'+esc(r.other.display_name)+'</b><small>'+(r.direction==='in'?'Sent you a friend request':'Waiting for a response')+'</small></div>'+
      (r.direction==='in' ? '<button class="mini positive" data-accept="'+esc(r.id)+'" title="Accept">' + ico('check',16) + '</button><button class="icon-btn" data-decline="'+esc(r.id)+'" title="Decline">×</button>' : '<button class="icon-btn" data-cancel="'+esc(r.id)+'" title="Cancel request">×</button>') + '</div>').join('') +
    '</section></div>' +
    '<section class="card list-card"><div class="card-title"><span class="card-icon">' + ico('friends',19) + '</span><div><h3>Your friends <span class="pill">'+state.friends.length+'</span></h3><p>The people you can message anytime.</p></div></div>' +
    (!state.friends.length ? '<div class="friend-empty"><span class="friend-empty-icon">' + ico('friends',29) + '</span><h3>It is better together.</h3><p>Search for someone you know to send your first friend request.</p></div>' : '') +
    state.friends.map(f => '<div class="row friend-row">' + avatar(f.other,47) + '<div class="row-main"><b>' + esc(f.other.display_name) + '</b><small>@'+esc(f.other.username)+'</small></div><button class="primary friend-message-btn" data-direct="'+esc(f.other.id)+'">'+ico('chat',16)+' Message</button><button class="icon-btn remove-friend" title="Remove friend" data-remove="'+esc(f.other.id)+'">×</button></div>').join('') +
    '</section></div></section>';
}
function settingsPane() {
  const p=state.profile;
  return '<section class="chat-space"><div class="page settings-page">' +
    '<header class="page-hero"><div><span class="eyebrow">MAKE DRIFT YOURS</span><h1>Settings<span class="heading-dot">.</span></h1><p>Personalize your space and stay in control of your privacy.</p></div><span class="page-hero-icon">' + ico('settings',33) + '</span></header>' +
    '<div class="cards settings-cards"><section class="card profile-settings"><div class="settings-cover"><div class="cover-glow"></div><span class="cover-dots">✦ ✦ ✦</span><span class="cover-label">YOUR PROFILE</span></div>' +
      '<div class="profile-head"><div class="profile-avatar-wrap">' + avatar(p,78) + '</div><div><b>' + esc(p.display_name) + '</b><div class="muted tiny">@'+esc(p.username)+'</div><label class="upload">' + ico('plus',14) + ' Change photo<input id="avatar-file" type="file" accept="image/png,image/jpeg,image/webp"></label></div></div>' +
      '<div class="settings-inner"><h3>Profile details</h3><p>How your friends see you on DRIFT.</p><form id="profile-form" class="form-grid">' +
        '<label>Display name<input name="display" required maxlength="40" value="'+esc(p.display_name)+'"></label>' +
        '<label>Username<input name="username" required minlength="3" maxlength="20" pattern="[a-z0-9_]{3,20}" value="'+esc(p.username)+'"></label>' +
        '<label>About you<input name="bio" maxlength="160" placeholder="A little something about you" value="'+esc(p.bio||'')+'"></label>' +
        '<label>Pick your accent</label><div class="colors">' + Object.keys(COLORS).map(color => '<button type="button" class="color '+(p.accent===color?'active':'')+'" style="background:'+COLORS[color]+'" data-color="'+color+'" title="'+color+'" aria-label="Choose '+color+' accent">'+(p.accent===color?ico('check',17):'')+'</button>').join('')+'</div>' +
        '<label class="checkrow"><input type="checkbox" name="allow" '+(p.allow_friend_requests?'checked':'')+'><span>Allow new friend requests</span></label>' +
        '<button type="submit" class="primary full">' + ico('check',17) + ' Save profile changes</button></form></div></section>' +
    '<section class="card privacy-settings"><div class="card-title"><span class="card-icon">' + ico('shield',21) + '</span><div><h3>Privacy & security</h3><p>Your account. Your boundaries.</p></div></div>' +
      '<div class="privacy-feature">' + ico('lock',19) + '<div><b>Friends-first messaging</b><p>Only accepted friends can start private chats with you. Messages are not end-to-end encrypted.</p></div></div>' +
      '<div class="settings-section-title"><h3>Blocked accounts</h3><span class="pill">' + state.blocks.length + '</span></div>' +
      (!state.blocks.length ? '<div class="blocked-empty">' + ico('shield',22) + '<span>No blocked accounts. You are all set.</span></div>' : '') +
      state.blocks.map(b => '<div class="row">' + avatar(b.other,38) + '<div class="row-main"><b>'+esc(b.other.display_name)+'</b><small>@'+esc(b.other.username)+'</small></div><button class="ghost" data-unblock="'+esc(b.other.id)+'">Unblock</button></div>').join('') +
      '<div class="settings-signout"><button class="ghost full" data-action="signout">' + ico('logout',18) + ' Sign out of DRIFT</button></div></section></div></div></section>';
}
function render() {
  if (!state.user) return authScreen();
  if (!state.profile) return;
  document.documentElement.style.setProperty('--accent', COLORS[state.profile.accent] || COLORS.violet);
  root.innerHTML = '<div class="layout '+(state.view==='chats'&&state.active?'show-chat':'')+' '+(state.view!=='chats'?'no-sidebar':'')+'">' +
    nav() + (state.view==='chats'?sidebar():'') + (state.view==='chats'?chatPane():state.view==='friends'?friendsPane():settingsPane()) +
    '</div>' + (state.modal?modalHtml():'');
  connect();
}
function modalHtml() {
  const id=state.modal;
  const c=state.chats.find(c=>c.id===state.active);
  let body='';
  if(id==='newgroup') body='<form class="form-grid" id="group-form"><label>Group name<input name="name" required maxlength="60" placeholder="Group name"></label><p class="muted tiny">Add one or more friends.</p><div class="selector">'+state.friends.map(f=>'<label class="checkrow"><input type="checkbox" name="members" value="'+esc(f.other.id)+'">'+esc(f.other.display_name)+'</label>').join('')+'</div><button class="primary full" type="submit">Create group</button></form>';
  if(id==='details' && c) {
    body='<div class="notice">'+(c.type==='group'?'Only group members can see these conversations.':'Only you and your friend can view these messages.')+'</div>';
    if(c.type==='group') body+='<div class="form-grid" style="margin-top:17px"><label>Group name<input id="rename-input" value="'+esc(c.title)+'" maxlength="60"></label><button class="ghost" data-action="rename">Rename group</button><button class="danger" data-action="leave">Leave group</button></div>';
    if(c.type==='direct') body+='<div class="form-grid" style="margin-top:18px"><button class="danger" data-action="blockcontact">Block this user</button><button class="ghost" data-action="reportcontact">Report this user</button></div>';
  }
  if(id==='report') body='<form id="report-form" class="form-grid"><p class="muted tiny">Your report will be stored. This small app does not currently have a staffed moderation team.</p><label>Reason<select name="reason"><option value="harassment">Harassment</option><option value="spam">Spam</option><option value="inappropriate">Inappropriate content</option><option value="impersonation">Impersonation</option><option value="other">Other</option></select></label><label>Details<textarea rows="3" maxlength="1000" name="details"></textarea></label><button class="primary" type="submit">Save report</button></form>';
  return '<div class="overlay" id="overlay"><div class="dialog" role="dialog" aria-modal="true"><div class="dialog-header"><h2>'+({newgroup:'New group',details:'Conversation details',report:'Report a user'}[id]||'Details')+'</h2><button class="icon-btn" data-action="closemodal">×</button></div>'+body+'</div></div>';
}
function connect() {
  root.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;state.active=null;state.searchResults=[];render();}));
  root.querySelectorAll('[data-chat]').forEach(b=>b.addEventListener('click',()=>{void chooseChat(b.dataset.chat);}));
  root.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{void act(b.dataset.action);}));
  root.querySelectorAll('[data-direct]').forEach(b=>b.addEventListener('click',()=>void withBusy(async()=>{const cid=requireOk(await sb.rpc('get_or_create_direct',{_other:b.dataset.direct}));await refreshAll();await chooseChat(cid);})));
  root.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>void withBusy(async()=>{requireOk(await sb.rpc('send_friend_request',{_username:b.dataset.add}));note('Friend request sent');state.friendSearch=[];await refreshAll();render();})));
  root.querySelectorAll('[data-accept]').forEach(b=>b.addEventListener('click',()=>void friendResponse(b.dataset.accept,true)));
  root.querySelectorAll('[data-decline]').forEach(b=>b.addEventListener('click',()=>void friendResponse(b.dataset.decline,false)));
  root.querySelectorAll('[data-cancel]').forEach(b=>b.addEventListener('click',()=>void withBusy(async()=>{requireOk(await sb.rpc('cancel_friend_request',{_id:b.dataset.cancel}));await refreshAll();render();})));
  root.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{if(confirm('Remove this friend?'))void withBusy(async()=>{requireOk(await sb.rpc('remove_friend',{_other:b.dataset.remove}));await refreshAll();render();});}));
  root.querySelectorAll('[data-unblock]').forEach(b=>b.addEventListener('click',()=>void withBusy(async()=>{requireOk(await sb.rpc('unblock_user',{_other:b.dataset.unblock}));await refreshAll();render();})));
  root.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>{state.profile.accent=b.dataset.color;render();}));
  $('#search-chats')?.addEventListener('submit',searchChat);
  $('#search-chats input')?.addEventListener('input',e=>{state.chatFilter=e.target.value;});
  $('#message-form')?.addEventListener('submit',sendMessage);
  $('#message-form input')?.addEventListener('input',e=>{state.draft=e.target.value;});
  $('#find-user-form')?.addEventListener('submit',findUser);
  $('#group-form')?.addEventListener('submit',createGroup);
  $('#profile-form')?.addEventListener('submit',saveProfile);
  $('#report-form')?.addEventListener('submit',saveReport);
  $('#avatar-file')?.addEventListener('change',e=>{void uploadAvatar(e.target.files[0]);});
  $('#overlay')?.addEventListener('click',e=>{if(e.target.id==='overlay'){state.modal=null;render();}});
}
async function friendResponse(id,accept) {
  await withBusy(async()=>{requireOk(await sb.rpc('respond_friend_request',{_id:id,_accept:accept}));await refreshAll();render();note(accept?'Friend request accepted':'Request declined');});
}
async function findUser(e) {
  e.preventDefault();const username=new FormData(e.currentTarget).get('username');
  await withBusy(async()=>{state.friendSearch=requireOk(await sb.rpc('search_users',{_q:username}))||[];render();if(!state.friendSearch.length) note('No matching users found');});
}
async function searchChat(e) {
  e.preventDefault();
  const q=state.chatFilter.trim();
  if(!q){state.searchResults=[];render();return;}
  await withBusy(async()=>{state.searchResults=requireOk(await sb.rpc('search_messages',{_q:q,_limit:25}))||[];render();if(!state.searchResults.length)note('No messages found. Conversation names are also filtered.');});
}
async function sendMessage(e) {
  e.preventDefault();
  const body=state.draft.trim();
  if(!body || !state.active)return;
  const conv=state.active;
  state.draft='';
  const form=$('#message-form');if(form)form.querySelector('input').value='';
  await withBusy(async()=>{
    try {
      requireOk(await sb.from('messages').insert({conversation_id:conv,sender_id:state.user.id,body,client_id:crypto.randomUUID()}));
      await loadMessages();await refreshAll();render();scrollBottom();
    } catch(err){state.draft=body;render();throw err;}
  });
}
async function createGroup(e) {
  e.preventDefault();const f=new FormData(e.currentTarget);
  const members=f.getAll('members');
  if(!members.length)return note('Select at least one friend');
  await withBusy(async()=>{const cid=requireOk(await sb.rpc('create_group',{_title:f.get('name'),_members:members}));state.modal=null;await refreshAll();await chooseChat(cid);});
}
async function saveProfile(e) {
  e.preventDefault();const f=new FormData(e.currentTarget);
  await withBusy(async()=>{
    const d={
      username:String(f.get('username')).toLowerCase(),display_name:String(f.get('display')).trim(),
      bio:String(f.get('bio')||''),accent:state.profile.accent,
      allow_friend_requests:f.get('allow')==='on'
    };
    requireOk(await sb.from('profiles').update(d).eq('id',state.user.id));
    state.profile=await decorated(requireOk(await sb.from('profiles').select('*').eq('id',state.user.id).single()));
    render();note('Profile saved');
  });
}
async function uploadAvatar(file) {
  if(!file)return;
  if(file.size>2*1024*1024 || !['image/png','image/jpeg','image/webp'].includes(file.type))return note('Choose PNG, JPEG or WebP up to 2 MB');
  await withBusy(async()=>{
    const ext=file.type.split('/')[1].replace('jpeg','jpg');
    const path=state.user.id+'/'+crypto.randomUUID()+'.'+ext;
    requireOk(await sb.storage.from('avatars').upload(path,file,{contentType:file.type,upsert:false}));
    requireOk(await sb.from('profiles').update({avatar_url:path}).eq('id',state.user.id));
    state.profile=await decorated(requireOk(await sb.from('profiles').select('*').eq('id',state.user.id).single()));
    render();note('Profile photo saved');
  });
}
async function saveReport(e) {
  e.preventDefault();const f=new FormData(e.currentTarget);
  const c=state.chats.find(c=>c.id===state.active);
  const target=c?.other_id;
  if(!target)return note('Choose the user you are reporting');
  await withBusy(async()=>{
    requireOk(await sb.from('reports').insert({
      reporter_id:state.user.id,target_user_id:target,conversation_id:state.active,
      reason:f.get('reason'),details:f.get('details')||''
    }));
    state.modal=null;render();note('Report saved');
  });
}
async function act(action) {
  if(action==='newgroup'){state.modal='newgroup';render();return;}
  if(action==='details'){state.modal='details';render();return;}
  if(action==='closemodal'){state.modal=null;render();return;}
  if(action==='back'){state.active=null;render();return;}
  if(action==='older'){if(state.olderCursor)await withBusy(async()=>{await loadMessages(state.olderCursor);render();});return;}
  if(action==='signout'){closeRealtime();await sb.auth.signOut();state.user=null;state.profile=null;state.active=null;state.modal=null;state.chats=[];authScreen();return;}
  if(action==='reportcontact'){state.modal='report';render();return;}
  const c=state.chats.find(c=>c.id===state.active);if(!c)return;
  if(action==='blockcontact'){if(!confirm('Block this user? They will no longer be able to send you friend requests or new messages.'))return;await withBusy(async()=>{requireOk(await sb.rpc('block_user',{_other:c.other_id}));state.modal=null;state.active=null;await refreshAll();render();note('User blocked');});return;}
  if(action==='leave'){if(!confirm('Leave this group?'))return;await withBusy(async()=>{requireOk(await sb.rpc('leave_conversation',{_conv:c.id}));state.active=null;state.modal=null;await refreshAll();render();});return;}
  if(action==='rename'){const title=$('#rename-input')?.value;if(!title)return;await withBusy(async()=>{requireOk(await sb.rpc('rename_group',{_conv:c.id,_title:title}));state.modal=null;await refreshAll();render();});}
}
(async function init(){
  try {
    const url=new URL(location.href);
    if(url.searchParams.has('error_description'))note(url.searchParams.get('error_description'));
    const session=await sb.auth.getSession();
    const user=session.data.session?.user;
    if(user) await startSignedIn();
    else authScreen();
    sb.auth.onAuthStateChange((event,session2)=>{
      if(event==='PASSWORD_RECOVERY'){state.authMode='reset';authScreen();}
      if(event==='SIGNED_OUT'){state.user=null;state.profile=null;closeRealtime();authScreen();}
      if(event==='SIGNED_IN' && !state.user && session2?.user){setTimeout(()=>{void startSignedIn().catch(e=>note(e.message));},0);}
    });
  } catch(e) {
    console.error(e);
    root.innerHTML='<div class="auth-screen"><div class="auth-box"><h1>DRIFT connection issue</h1><p>The messaging server could not be reached. Check the network and refresh the page.</p><button class="primary" onclick="location.reload()">Retry</button></div></div>';
    note(e?.message || 'Could not connect to messaging server');
  }
})();
