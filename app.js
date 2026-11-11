
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
const brand = () => '<span class="brand"><span class="logo">◉</span><b>drift</b><span>.</span></span>';
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
  let title = m === 'signup' ? 'Create your account' : m === 'forgot' ? 'Reset password' : m === 'reset' ? 'Choose a new password' : 'Welcome back';
  let subtitle = m === 'signup' ? 'Create an account to start talking with your friends.' : m === 'forgot' ? 'Get a password reset email if you have an account.' : m === 'reset' ? 'Enter the new password for your account.' : 'Sign in to your private conversations.';
  root.innerHTML = '<main class="auth-screen"><section class="auth-box">' + brand() +
    '<h1>' + title + '</h1><p>' + subtitle + '</p>' +
    '<form id="auth-form">' +
    (m === 'signup' ? '<label>Username<input name="username" required autocomplete="username" pattern="[a-z0-9_]{3,20}" minlength="3" maxlength="20" placeholder="your_username"></label><label>Display name<input name="display" maxlength="40" placeholder="Your name"></label>' : '') +
    (m === 'reset' ? '' : '<label>Email<input name="email" type="email" autocomplete="email" placeholder="you@example.com" required></label>') +
    (m === 'forgot' ? '' : '<label>' + (m === 'reset' ? 'New password' : 'Password') + '<input type="password" name="password" minlength="8" autocomplete="' + (m === 'signin' ? 'current-password' : 'new-password') + '" required placeholder="At least 8 characters"></label>') +
    '<button class="primary full" type="submit">' + (m === 'signup' ? 'Create account' : m === 'forgot' ? 'Send reset email' : m === 'reset' ? 'Update password' : 'Sign in') + '</button></form>' +
    '<div class="auth-links">' + (m === 'signin' ? '<button class="link-btn" data-auth="forgot">Forgot password?</button><button class="link-btn" data-auth="signup">New here? Create account</button>' : '<button class="link-btn" data-auth="signin">Back to sign in</button>') + '</div>' +
    '<div class="auth-warning">Sign in with your DRIFT email and password. Problems will appear as a message, so you can tell whether sign-in or chat loading failed.</div>' +
    '</section></main>';
  $('#auth-form').addEventListener('submit', handleAuth);
  root.querySelectorAll('[data-auth]').forEach(btn => btn.addEventListener('click', () => { state.authMode = btn.dataset.auth; authScreen(); }));
  const passwordInput = $('#auth-form input[type="password"]');
  if (passwordInput) {
    const show = document.createElement('button');
    show.type = 'button';
    show.className = 'link-btn';
    show.style.textAlign = 'left';
    show.textContent = 'Show password';
    show.addEventListener('click', () => {
      passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
      show.textContent = passwordInput.type === 'password' ? 'Show password' : 'Hide password';
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
  return '<nav class="rail"><div class="logo">◉</div><div class="railnav">' +
    [['chats','◌','Chats'],['friends','♧','Friends'],['settings','⚙','Settings']].map(a => '<button class="nav-btn ' + (state.view === a[0] ? 'active':'') + '" data-view="' + a[0] + '"><span class="glyph">' + a[1] + '</span><span>' + a[2] + '</span></button>').join('') +
    '</div>' + avatar(state.profile,35) + '</nav>';
}
function sidebar() {
  const filtered = state.chats.filter(c => labelFor(c).toLowerCase().includes(state.chatFilter.toLowerCase()));
  return '<aside class="sidebar"><div class="side-head"><div><div class="eyebrow">YOUR SPACE</div><h2>Messages</h2></div><button class="icon-btn" data-action="newgroup" title="Create group">＋</button></div>' +
  '<form class="field-search" id="search-chats"><span>⌕</span><input name="q" placeholder="Search chats or messages" value="' + esc(state.chatFilter) + '"><button class="icon-btn" title="Search messages">↵</button></form>' +
  '<div class="list-body"><div class="list-caption">CONVERSATIONS · ' + state.chats.length + '</div>' +
  (state.searchResults.length ? state.searchResults.map(m => '<button class="chat-item" data-chat="' + esc(m.conversation_id) + '"><div class="chat-copy"><b>' + esc(m.conv_title || m.sender_display_name || 'Message') + '</b><small>' + esc(m.body) + '</small></div></button>').join('') : filtered.map(c => '<button class="chat-item ' + (state.active === c.id ? 'selected':'') + '" data-chat="' + esc(c.id) + '"><span class="avatar" style="width:43px;height:43px">' + (c.type === 'group'?'♧':esc(initial(c.other_display_name))) + '</span><span class="chat-copy"><b>' + esc(labelFor(c)) + '</b><small>' + esc(c.last_body || (c.type==='group'? c.member_count+' members':'@'+c.other_username)) + '</small></span>' + (Number(c.unread)>0?'<span class="unread">'+Number(c.unread)+'</span>':'') + '</button>').join('')) +
  (!filtered.length && !state.searchResults.length ? '<div class="empty"><strong>Nothing here yet</strong>Add friends, then start a conversation.</div>':'') +
  '</div><div class="side-foot"><button class="ghost full" data-view="friends">♧ Find a friend</button></div></aside>';
}
function chatPane() {
  if (!state.active) return '<section class="chat-space"><div class="welcome"><span class="welcome-icon">◉</span><h2>Your conversations, your space.</h2><p>Choose a conversation or add a friend to start talking.</p><button class="primary" data-view="friends">Find friends</button></div></section>';
  const c = state.chats.find(c=>c.id===state.active);
  if (!c) {state.active=null;return chatPane();}
  return '<section class="chat-space"><div class="chat-header"><button class="icon-btn mobile-back" data-action="back">←</button>' +
    '<span class="avatar" style="height:40px;width:40px">' + (c.type==='group'?'♧':initial(c.other_display_name)) + '</span><div class="identity"><b>' + esc(labelFor(c)) + '</b><small>' + (c.type==='group'?Number(c.member_count)+' members':'@'+esc(c.other_username||'')) + '</small></div>' +
    '<button class="icon-btn" title="Chat details" data-action="details">⋯</button></div><div class="chat-log" id="chat-log">' +
    (state.olderCursor?'<button class="ghost" data-action="older">Load older messages</button>':'') +
    (!state.messages.length?'<div class="empty"><strong>Say hello</strong>Only the members of this chat can see your messages.</div>':'') +
    state.messages.map(m => {
      const mine=m.sender_id===state.user.id;
      return '<div class="chat-row '+(mine?'mine':'')+'"><div class="bubble-wrap"><div class="bubble">' + (m.deleted_at?'<i>Message deleted</i>':esc(m.body)) + '</div><div class="meta">' + new Date(m.created_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+'</div></div></div>';
    }).join('') +
    '</div><div class="composer"><form id="message-form"><input name="body" autocomplete="off" maxlength="4000" placeholder="Message ' + esc(labelFor(c)) + '..." value="' + esc(state.draft) + '"><button class="primary" type="submit">➤</button></form><div class="compose-note">Private to chat members · Not end-to-end encrypted</div></div></section>';
}
function friendsPane() {
  return '<section class="chat-space"><div class="page"><div class="eyebrow">YOUR PEOPLE</div><h1>Friends<span style="color:var(--accent)">.</span></h1><p>Search by username. Everyone approves their own friend requests.</p>' +
    '<div class="cards"><div class="card"><h3>♧ Add a friend</h3><form id="find-user-form" class="add-form"><input name="username" placeholder="Exact username" required><button class="primary" type="submit">Find</button></form>' +
    (state.friendSearch.length?state.friendSearch.map(p => '<div class="row">' + avatar(p) + '<div class="row-main"><b>' + esc(p.display_name) + '</b><small>@'+esc(p.username)+'</small></div><button class="mini" data-add="'+esc(p.username)+'">Add</button></div>').join(''):'') +
    '</div><div class="card"><h3>Requests <span class="pill">' + state.requests.filter(r=>r.direction==='in').length + '</span></h3>' +
    (!state.requests.length?'<p>No friend requests.</p>':'') +
    state.requests.map(r=>'<div class="row">'+avatar(r.other)+'<div class="row-main"><b>'+esc(r.other.display_name)+'</b><small>'+(r.direction==='in'?'Wants to be friends':'Awaiting reply')+'</small></div>'+(r.direction==='in'?'<button class="mini" data-accept="'+esc(r.id)+'">✓</button><button class="icon-btn" data-decline="'+esc(r.id)+'">×</button>':'<button class="icon-btn" data-cancel="'+esc(r.id)+'" title="Cancel request">×</button>')+'</div>').join('')+
    '</div></div><div class="card list-card"><h3>All friends <span class="pill">'+state.friends.length+'</span></h3>' +
    (!state.friends.length?'<div class="empty"><strong>No friends yet</strong>Find someone by their username and send a request.</div>':'') +
    state.friends.map(f=>'<div class="row">'+avatar(f.other)+'<div class="row-main"><b>'+esc(f.other.display_name)+'</b><small>@'+esc(f.other.username)+'</small></div><button class="primary" data-direct="'+esc(f.other.id)+'">Message</button><button class="icon-btn" title="Remove friend" data-remove="'+esc(f.other.id)+'">×</button></div>').join('')+
    '</div></div></section>';
}
function settingsPane() {
  const p=state.profile;
  return '<section class="chat-space"><div class="page"><div class="eyebrow">YOUR IDENTITY</div><h1>Settings<span style="color:var(--accent)">.</span></h1><p>Customize your profile and choose who can contact you.</p><div class="cards">' +
    '<div class="card"><h3>◉ Your profile</h3><div class="profile-head">'+avatar(p,70)+'<div><b>'+esc(p.display_name)+'</b><div class="muted tiny">@'+esc(p.username)+'</div><label class="upload">Change profile picture<input id="avatar-file" type="file" accept="image/png,image/jpeg,image/webp"></label></div></div>' +
    '<form id="profile-form" class="form-grid"><label>Display name<input name="display" required maxlength="40" value="'+esc(p.display_name)+'"></label><label>Username<input name="username" required minlength="3" maxlength="20" pattern="[a-z0-9_]{3,20}" value="'+esc(p.username)+'"></label><label>Bio<input name="bio" maxlength="160" value="'+esc(p.bio||'')+'"></label>' +
    '<label>Accent color</label><div class="colors">' + Object.keys(COLORS).map(color=>'<button type="button" class="color '+(p.accent===color?'active':'')+'" style="background:'+COLORS[color]+'" data-color="'+color+'" title="'+color+'"></button>').join('')+'</div>'+
    '<label class="checkrow"><input type="checkbox" name="allow" style="width:18px" '+(p.allow_friend_requests?'checked':'')+'>Accept new friend requests</label>' +
    '<button type="submit" class="primary full">Save changes</button></form></div>' +
    '<div class="card"><h3>♧ Safety & privacy</h3><div class="notice">Messages are restricted to conversation members, but they are not end-to-end encrypted. Only add friends you know and avoid sharing personal information.</div><h3 style="margin-top:22px">Blocked users</h3>' +
    (!state.blocks.length?'<p>You have not blocked anyone.</p>':'') +
    state.blocks.map(b=>'<div class="row">'+avatar(b.other,35)+'<div class="row-main"><b>'+esc(b.other.display_name)+'</b><small>@'+esc(b.other.username)+'</small></div><button class="ghost" data-unblock="'+esc(b.other.id)+'">Unblock</button></div>').join('') +
    '<button class="ghost full" style="margin-top:26px" data-action="signout">Sign out</button></div></div></div></section>';
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
