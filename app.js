const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = value => Math.min(1, Math.max(0, value));
const ease = (start, end, value) => { const t = clamp((value - start) / (end - start)); return t * t * (3 - 2 * t); };

document.documentElement.classList.add('js-ready');
$('#year').textContent = new Date().getFullYear();
const menu = $('.menu-toggle');
const nav = $('#navigation');
function closeMenu() { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open menu'); }
menu.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});
$$('#navigation a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); menu.focus(); } });
document.addEventListener('click', event => { if (!event.target.closest('.header')) closeMenu(); });
if ('IntersectionObserver' in window) {
  const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); reveal.unobserve(entry.target); }
  }), { threshold: .08 });
  $$('.reveal').forEach(element => reveal.observe(element));
} else { $$('.reveal').forEach(element => element.classList.add('visible')); }

const stages = [
  { eyebrow: '01 / THE LAND', title: 'First, we<span class="desktop-break"></span> <em>read the possibilities.</em>', description: 'Access, orientation, the street and the skyline. Every multistorey residence begins with understanding its site and the lives it will bring together.', label: 'UNDERSTANDING THE SITE', note: { title: 'A considered footprint.', text: 'Site levels, local development rules, setbacks and access shape the buildable envelope. Landscape and shared outdoor space belong in the plan from the beginning.' } },
  { eyebrow: '02 / THE LINES', title: 'A clear idea.<span class="desktop-break"></span> <em>On every level.</em>', description: 'Floor plates stack into a connected whole. We study apartment layouts, vertical circulation, balconies and services together, so the building works from the ground up.', label: 'DRAWING EVERY LEVEL', note: { title: 'Plan the building as a whole.', text: 'Coordinated plans, elevations and sections connect private homes with shared spaces. Structural, fire-safety and service requirements are developed with the relevant consultants.' } },
  { eyebrow: '03 / THE LIFE', title: 'A new presence.<span class="desktop-break"></span> <em>A place to belong.</em>', description: 'Layered terraces, warm materials and a welcoming entrance give the building its character. Shading, planting and proportion bring a human scale to every storey.', label: 'THE TERRACE RESIDENCES', note: { title: 'A façade with purpose.', text: 'Balconies and screens balance daylight, shade and privacy. Materials are considered for weather, maintenance and the way the building meets its neighborhood.' } },
  { eyebrow: '04 / THE INSIDE', title: 'Above the everyday.<span class="desktop-break"></span> <em>Close to what matters.</em>', description: 'Inside, the focus becomes personal. A light-filled apartment, a planted balcony and thoughtful storage turn a floor plan into a comfortable place for daily life.', label: 'INSIDE THE APARTMENT', note: { title: 'Make every square metre count.', text: 'Furniture layouts, clear circulation and integrated joinery make compact and generous homes work equally hard. Daylight and layered lighting bring warmth throughout the day.' } }
];
const story = $('#story');
const stage = $('.story-stage');
const wirePaths = $$('#wire-paths path');
wirePaths.forEach(path => { path.setAttribute('pathLength', '1'); path.classList.add('wire-stroke'); });
let currentStage = -1;
function selectStage(index) {
  currentStage = index;
  const content = stages[index];
  $('#stage-eyebrow').textContent = content.eyebrow;
  $('#stage-title').innerHTML = content.title;
  $('#stage-description').textContent = content.description;
  $('#scene-label').textContent = content.label;
  $('#scene').setAttribute('aria-label', ['A site study for a multistorey residential building', 'A wireframe elevation of a four-storey residential building', 'A realistic four-storey residential building with planted balconies', 'A warm apartment interior opening onto an elevated balcony'][index]);
  $('.scene-counter').textContent = `0${index + 1} — 04`;
  $$('.story-tabs button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  $('#note-title').textContent = content.note.title;
  $('#note-description').textContent = content.note.text;
  if (!motionPreference.matches) { $('.story-copy').classList.remove('copy-change'); requestAnimationFrame(() => $('.story-copy').classList.add('copy-change')); }
}
function renderScene(progress) {
  const index = progress < .2 ? 0 : progress < .47 ? 1 : progress < .76 ? 2 : 3;
  if (index !== currentStage) selectStage(index);
  if (motionPreference.matches) {
    ['land', 'wire', 'exterior', 'interior'].forEach((name, i) => { $(`#${name}-layer`).style.opacity = i === index ? '1' : '0'; });
    wirePaths.forEach(path => path.style.strokeDashoffset = '0');
    $('#exterior-layer').removeAttribute('transform');
    $('#interior-layer').removeAttribute('transform');
  } else {
    $('#land-layer').style.opacity = 1 - ease(.17, .28, progress);
    $('#wire-layer').style.opacity = ease(.17, .23, progress) * (1 - ease(.48, .58, progress));
    wirePaths.forEach((path, i) => { const start = .2 + i / wirePaths.length * .15; path.style.strokeDashoffset = 1 - ease(start, start + .075, progress); });
    $('#exterior-layer').style.opacity = ease(.47, .58, progress) * (1 - ease(.8, .9, progress));
    const zoom = 1 + ease(.73, .89, progress) * .55;
    $('#exterior-layer').setAttribute('transform', `translate(450 330) scale(${zoom}) translate(-450 -330)`);
    $('#interior-layer').style.opacity = ease(.78, .9, progress);
    const interiorZoom = 1.08 - ease(.79, .96, progress) * .08;
    $('#interior-layer').setAttribute('transform', `translate(450 300) scale(${interiorZoom}) translate(-450 -300)`);
  }
  $('.story-progress>span').style.transform = `scaleX(${progress})`;
}
const stageTargets = [.08, .44, .64, .94];
$$('.story-tabs button').forEach(button => button.addEventListener('click', () => {
  const top = parseFloat(getComputedStyle(stage).top);
  const target = story.getBoundingClientRect().top + scrollY - top + stageTargets[Number(button.dataset.stage)] * (story.offsetHeight - stage.offsetHeight);
  scrollTo({ top: target, behavior: motionPreference.matches ? 'instant' : 'smooth' });
}));
let scrollPending = false;
function onScroll() {
  if (scrollPending) return;
  scrollPending = true;
  requestAnimationFrame(() => {
    scrollPending = false;
    const bounds = story.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(stage).top);
    renderScene(clamp((top - bounds.top) / Math.max(1, story.offsetHeight - stage.offsetHeight)));
    const y = scrollY + innerHeight * .4;
    let active = '';
    ['story', 'services', 'studio', 'contact'].forEach(id => { if ($(`#${id}`).getBoundingClientRect().top + scrollY <= y) active = id; });
    $$('#navigation a').forEach(link => { const selected = link.hash === `#${active}`; link.classList.toggle('active', selected); if (selected) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
  });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
motionPreference.addEventListener('change', onScroll);
onScroll();

// Keep the drafting service's preview in the same drawing language as the journey.
const svgNS = 'http://www.w3.org/2000/svg';
const blueprint = document.createElementNS(svgNS, 'svg');
blueprint.setAttribute('viewBox', '0 0 900 600');
blueprint.setAttribute('aria-label', 'Architectural elevation drawing of the four-storey residential concept');
blueprint.setAttribute('role', 'img');
blueprint.classList.add('service-blueprint');
blueprint.style.display = 'none';
const drawing = $('#wire-paths').cloneNode(true);
drawing.removeAttribute('id');
drawing.querySelectorAll('path').forEach(path => { path.removeAttribute('class'); path.style.strokeDashoffset = '0'; });
blueprint.appendChild(drawing);
$('.service-image').appendChild(blueprint);
$$('.service-list details').forEach(detail => detail.addEventListener('toggle', () => {
  if (!detail.open) return;
  $$('.service-list details').forEach(other => { if (other !== detail) other.open = false; });
  const image = detail.dataset.image;
  const isWire = image === 'wire';
  blueprint.style.display = isWire ? 'block' : 'none';
  $('.service-image').classList.toggle('wire-mode', isWire);
  if (!isWire) {
    $('#service-image').src = `assets/${image}.png`;
    $('#service-image').alt = image === 'apartment-interior' ? 'Apartment interior concept with warm natural textures and a planted balcony' : 'Four-storey residential concept with balconies and a landscaped entrance';
  }
  $('#service-image-label').textContent = detail.dataset.caption;
}));

const processContent = [
  ['FIRST, A CONVERSATION.', 'We listen to how you live, what you love, and what you need. A site visit helps us understand the place, your priorities, and the scope of the journey ahead.'],
  ['THINKING IN POSSIBILITIES.', 'We explore layouts, proportions and material directions. Sketches and visual studies help you compare the options and choose a direction that feels right.'],
  ['THE DETAILS MAKE THE DIFFERENCE.', 'Plans become coordinated drawings, material selections and carefully resolved details. We define the scope so contractors and consultants can work from a clear design.'],
  ['FROM PAPER TO PLACE.', 'As work progresses, design coordination and agreed site visits help resolve questions. Finishes, furniture and the final details bring the spaces together for everyday living.']
];
$$('[data-process]').forEach(button => button.addEventListener('click', () => {
  const index = Number(button.dataset.process);
  $$('[data-process]').forEach(other => { const selected = other === button; other.classList.toggle('active', selected); other.setAttribute('aria-pressed', String(selected)); });
  $('#process-label').textContent = processContent[index][0];
  $('#process-text').textContent = processContent[index][1];
}));

const form = $('#enquiry-form');
if (form) {
const validators = {
  name: value => value.trim().length >= 2 ? '' : 'Please enter your name (at least 2 characters).',
  email: value => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? '' : 'Please enter a valid email address.',
  purpose: value => value ? '' : 'Please choose the purpose of your enquiry.'
};
function validateField(key) {
  const field = $(`#${key}`);
  const error = validators[key](field.value);
  $(`#${key}-error`).textContent = error;
  field.setAttribute('aria-invalid', String(Boolean(error)));
  return !error;
}
Object.keys(validators).forEach(key => {
  $(`#${key}`).addEventListener('blur', () => validateField(key));
  $(`#${key}`).addEventListener('input', () => { if ($(`#${key}`).getAttribute('aria-invalid') === 'true') validateField(key); });
});
$$('[data-purpose]').forEach(link => link.addEventListener('click', () => {
  if ($('#form-fields').hidden) resetEnquiry();
  $('#purpose').value = link.dataset.purpose;
  validateField('purpose');
}));
form.addEventListener('submit', async event => {
  event.preventDefault();
  $('#form-error').textContent = '';
  const valid = Object.keys(validators).map(validateField).every(Boolean);
  if (!valid) { form.querySelector('[aria-invalid=true]').focus(); return; }
  if ($('#website').value) return;
  const data = Object.fromEntries(new FormData(form));
  if (form.dataset.delivery === 'email') {
    const subject = `Project enquiry: ${data.purpose}`;
    const body = [
      'Hello Viraj Pawar Design Studio,', '',
      `Name: ${data.name.trim()}`, `Email: ${data.email.trim()}`,
      `Purpose: ${data.purpose}`, '', 'About my project:', data.message.trim() || '(No additional details)'
    ].join('\n');
    $('#email-draft-link').href = `mailto:virajpawar.nsk2001@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    $('#email-draft-link').hidden = false;
    $('#receipt-message').textContent = 'Your details are ready. Open the email draft below, then send it from your email app.';
    $('#receipt').textContent = 'No enquiry has been sent yet.';
    $('#form-fields').hidden = true;
    $('#form-success').hidden = false;
    $('#form-success').focus({ preventScroll: true });
    return;
  }
  const button = $('.submit-button');
  const label = $('.submit-button>span');
  button.disabled = true;
  form.setAttribute('aria-busy', 'true');
  label.textContent = 'Sending your enquiry…';
  try {
    if (location.protocol === 'file:') throw new Error('Please open this website through the Node server (npm start) to send your enquiry.');
    const response = await fetch('/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(30000) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.id) throw new Error(result.error || 'We could not save your enquiry. Please try again.');
    $('#visitor-name').textContent = data.name.trim().split(/\s+/)[0] + '.';
    $('#receipt-message').textContent = result.emailStatus === 'sent'
      ? 'Your enquiry has been emailed to the studio. We look forward to speaking with you.'
      : 'Your enquiry has been saved. You can also reach us directly at +91 7350600441 or virajpawar.nsk2001@gmail.com.';
    $('#receipt').textContent = `Your reference: ${result.id}`;
    $('#form-fields').hidden = true;
    $('#form-success').hidden = false;
    $('#form-success').focus({ preventScroll: true });
  } catch (error) {
    $('#form-error').textContent = error.name === 'TimeoutError' ? 'The connection took too long. Please try again.' : error instanceof TypeError ? 'We couldn’t connect. Please check your connection and try again.' : error.message;
  } finally {
    button.disabled = false;
    label.textContent = 'Send your enquiry';
    form.removeAttribute('aria-busy');
  }
});
function resetEnquiry() {
  form.reset();
  $('#form-success').hidden = true;
  $('#form-fields').hidden = false;
  $('#form-error').textContent = '';
  Object.keys(validators).forEach(key => { $(`#${key}`).removeAttribute('aria-invalid'); $(`#${key}-error`).textContent = ''; });
}
$('#another-enquiry').addEventListener('click', () => { resetEnquiry(); $('#name').focus(); });
}
