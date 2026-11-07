/* Browser-only regression checks; no Node/npm dependencies.
   Load after the fixture DOM, set viewport to 320/375/390/430/700, then call
   runMobileLayoutChecks(). Fixture: workspace/lift-mobile-layout-fixture/index.html.
   Native input/select text and SVG internals are not DOM overflow candidates;
   intentional analytics scrollers are tested separately below. */
window.runMobileLayoutChecks = function () {
  const failures = [];
  const check = (ok, message) => { if (!ok) failures.push(message); };
  const width = document.documentElement.clientWidth;
  const name = el => el.className?.baseVal || el.className || el.tagName;
  const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  const filters = '.lift-tabs,.lift-periods,.lift-metrics';
  check(document.documentElement.scrollWidth <= width + 1, 'document overflows');
  for (const el of document.querySelectorAll('.app *')) {
    if (!visible(el) || el.closest('svg') || el.closest(filters)) continue;
    const rect = el.getBoundingClientRect();
    check(rect.left >= -1 && rect.right <= width + 1, `${name(el)} outside viewport`);
    if (!el.matches('input,select,textarea') && el.clientWidth) {
      check(el.scrollWidth <= el.clientWidth + 1, `${name(el)} content overflows`);
    }
  }
  const tabs = document.querySelector('[aria-label="Вид тренировки"]');
  const undo = tabs.previousElementSibling;
  if (width <= 600) {
    check(tabs.getBoundingClientRect().top >= undo.getBoundingClientRect().bottom, 'modes share undo row');
    check(Math.abs(tabs.clientWidth - tabs.parentElement.clientWidth) <= 1, 'modes not full width');
  }
  for (const button of tabs.children) {
    const range = document.createRange();
    range.selectNodeContents(button);
    const rect = button.getBoundingClientRect();
    for (const line of range.getClientRects()) {
      check(line.left >= rect.left && line.right <= rect.right + 1, `${button.textContent} clipped`);
    }
    check(range.getClientRects().length === 1, `${button.textContent} word split`);
    const css = getComputedStyle(button);
    check(css.textOverflow !== 'ellipsis' && css.visibility === 'visible', 'mode text hidden');
  }
  const inputs = [...document.querySelectorAll('.osfit-input-row > select')];
  if (width <= 600) check(inputs[1].getBoundingClientRect().top >= inputs[0].getBoundingClientRect().bottom, 'compare selects share row');
  const filtersEl = document.querySelector('.lift-metrics');
  check(getComputedStyle(filtersEl).overflowX === 'auto', 'analytics filters not scrollable');
  if (filtersEl.scrollWidth > filtersEl.clientWidth) {
    filtersEl.scrollLeft = filtersEl.scrollWidth;
    check(filtersEl.scrollLeft > 0, 'analytics filters cannot scroll');
    filtersEl.scrollLeft = 0;
  }
  return window.mobileLayoutResult = {width, passed: !failures.length, failures};
};
