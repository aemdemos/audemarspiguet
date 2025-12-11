/*
 * Accordion FAQ Block
 * Variant of accordion optimized for FAQ pages
 * https://www.hlx.live/developer/block-collection/accordion
 */

export default function decorate(block) {
  const allDetails = [];

  [...block.children].forEach((row) => {
    // decorate accordion item label
    const label = row.children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);

    // decorate accordion item body
    const body = row.children[1];
    body.className = 'accordion-item-body';

    // decorate accordion item
    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary, body);

    row.replaceWith(details);
    allDetails.push(details);
  });

  // Ensure only one accordion is open at a time
  allDetails.forEach((details) => {
    details.addEventListener('toggle', () => {
      if (details.open) {
        allDetails.forEach((otherDetails) => {
          if (otherDetails !== details && otherDetails.open) {
            otherDetails.open = false;
          }
        });
      }
    });
  });
}
