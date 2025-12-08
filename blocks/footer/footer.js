/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // Fetch footer content from Document Authoring
  try {
    const footerPath = block.textContent.trim() || '/footer';
    const resp = await fetch(`${footerPath}.plain.html`);
    if (!resp.ok) {
      return;
    }

    const html = await resp.text();

    // Parse the HTML using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Get all top-level div sections
    const sections = Array.from(doc.body.children).filter(el => el.tagName === 'DIV');

    if (sections.length < 2) {
      return;
    }

    // Clear the block
    block.textContent = '';

    const footer = document.createElement('div');
    footer.classList.add('footer-content');

    // Section 1: Partner logos (first div with ap-chronicles class)
    const partnerSection = document.createElement('div');
    partnerSection.classList.add('footer-partner-section');

    const partnerContent = sections[0].querySelector('.ap-chronicles');
    if (partnerContent) {
      const logosContainer = document.createElement('div');
      logosContainer.classList.add('footer-partner-logos');

      // Extract partner logo links from authored content
      const partnerLinks = partnerContent.querySelectorAll('a');
      partnerLinks.forEach((link) => {
        const logoDiv = document.createElement('div');
        const newLink = link.cloneNode(true);
        logoDiv.appendChild(newLink);
        logosContainer.appendChild(logoDiv);
      });

      partnerSection.appendChild(logosContainer);
    }
    footer.appendChild(partnerSection);

    // Section 2: Navigation wrapper (language button + nav sections)
    const navWrapper = document.createElement('div');
    navWrapper.classList.add('footer-nav-wrapper');

    // Extract language button from authored content
    const navContent = sections[1];
    const languagePara = navContent.querySelector('p');
    if (languagePara) {
      const langButton = document.createElement('button');
      langButton.classList.add('footer-language-button');

      // Extract the emoji and text
      const icon = document.createElement('span');
      icon.classList.add('icon', 'icon-globe');
      langButton.appendChild(icon);

      const langLink = languagePara.querySelector('a');
      if (langLink) {
        langButton.appendChild(document.createTextNode(' ' + langLink.textContent));
        langButton.addEventListener('click', () => {
          window.location.href = langLink.href;
        });
      }

      navWrapper.appendChild(langButton);
    }

    // Extract navigation sections from authored content (h3 + ul pairs)
    const headings = navContent.querySelectorAll('h3');
    headings.forEach((heading) => {
      const navSection = document.createElement('div');
      navSection.classList.add('footer-nav-section');

      // Desktop title
      const title = document.createElement('h4');
      title.classList.add('footer-nav-title');
      title.textContent = heading.textContent;
      navSection.appendChild(title);

      // Mobile accordion button
      const toggleButton = document.createElement('button');
      toggleButton.classList.add('footer-nav-toggle');
      toggleButton.setAttribute('aria-expanded', 'false');

      // Add button text
      const buttonText = document.createElement('span');
      buttonText.textContent = heading.textContent;
      toggleButton.appendChild(buttonText);

      // Add plus/minus icon
      const icon = document.createElement('img');
      icon.classList.add('footer-toggle-icon');
      icon.src = '/icons/plus.svg';
      icon.alt = '';
      toggleButton.appendChild(icon);

      // Content wrapper with links
      const contentWrapper = document.createElement('div');
      contentWrapper.classList.add('footer-nav-content');

      // Find the next ul element after this h3
      let nextEl = heading.nextElementSibling;
      while (nextEl && nextEl.tagName !== 'UL' && nextEl.tagName !== 'H3') {
        nextEl = nextEl.nextElementSibling;
      }

      if (nextEl && nextEl.tagName === 'UL') {
        const ul = nextEl.cloneNode(true);
        contentWrapper.appendChild(ul);
      }

      // Mobile toggle functionality
      toggleButton.addEventListener('click', () => {
        const isActive = toggleButton.classList.contains('active');
        toggleButton.classList.toggle('active');
        toggleButton.setAttribute('aria-expanded', !isActive);
        contentWrapper.classList.toggle('active');

        // Toggle icon between plus and minus
        const toggleIcon = toggleButton.querySelector('.footer-toggle-icon');
        if (toggleIcon) {
          toggleIcon.src = isActive ? '/icons/plus.svg' : '/icons/minus.svg';
        }
      });

      navSection.appendChild(toggleButton);
      navSection.appendChild(contentWrapper);
      navWrapper.appendChild(navSection);
    });

    footer.appendChild(navWrapper);

    // Section 3: Bottom section (legal, copyright)
    const bottomSection = document.createElement('div');
    bottomSection.classList.add('footer-bottom');

    if (!sections[2]) {
      return;
    }

    // Extract all content from section 2 (legal and copyright)
    const bottomContent = sections[2];
    const allParas = bottomContent.querySelectorAll('p');

    // Find legal paragraph (paragraph with pipes separating links)
    const legalPara = Array.from(allParas).find(p => {
      const text = p.textContent.trim();
      return text.includes('|') || text.includes('Terms');
    });

    if (legalPara) {
      const legalWrapper = document.createElement('div');
      legalWrapper.classList.add('footer-legal');

      const legalLinks = legalPara.querySelectorAll('a');
      let accessibilityGroup = null;

      legalLinks.forEach((link) => {
        // Check if this is the eA icon link (has an img inside)
        if (link.querySelector('img')) {
          const eaLink = document.createElement('a');
          eaLink.href = link.href;
          eaLink.target = '_blank';
          eaLink.setAttribute('aria-label', 'This icon serves as a link to download the eSSENTIAL Accessibility assistive technology app for individuals with physical disabilities. It is featured as part of our commitment to diversity and inclusion.');

          const eaImg = document.createElement('img');
          const imgSrc = link.querySelector('img');
          if (imgSrc) {
            eaImg.src = imgSrc.src;
            eaImg.alt = imgSrc.alt || 'eA icon';
            eaImg.classList.add('ea-icon');
          }

          eaLink.appendChild(eaImg);

          // Add eA icon to the accessibility group if it exists
          if (accessibilityGroup) {
            accessibilityGroup.appendChild(eaLink);
          } else {
            legalWrapper.appendChild(eaLink);
          }
        } else {
          // Check if this is the Accessibility link
          if (link.textContent.trim() === 'Accessibility') {
            // Create a group wrapper for Accessibility link and eA icon
            accessibilityGroup = document.createElement('div');
            accessibilityGroup.classList.add('footer-legal-accessibility-group');

            const a = document.createElement('a');
            a.href = link.href;
            a.textContent = link.textContent;
            accessibilityGroup.appendChild(a);

            legalWrapper.appendChild(accessibilityGroup);
          } else {
            // Regular legal link
            const a = document.createElement('a');
            a.href = link.href;
            a.textContent = link.textContent;
            legalWrapper.appendChild(a);
          }
        }
      });

      // Store legalWrapper for later append after social
      var _legalWrapper = legalWrapper;
    }

    // Extract social media icons from content
    // Find paragraph with social links (has multiple icon spans)
    const socialPara = Array.from(allParas).find(p => {
      const links = p.querySelectorAll('a');
      const iconSpans = p.querySelectorAll('span.icon');
      const text = p.textContent.trim();
      // Social paragraph: has multiple links with icon spans, not legal links
      return links.length > 1 && iconSpans.length > 1 && !text.includes('|') && !text.includes('Terms');
    });

    if (socialPara) {
      const socialWrapper = document.createElement('div');
      socialWrapper.classList.add('footer-social');

      const socialLinks = socialPara.querySelectorAll('a');
      socialLinks.forEach((link) => {
        const iconSpan = link.querySelector('span.icon');
        if (iconSpan) {
          const newLink = link.cloneNode(true);
          newLink.target = '_blank';
          newLink.rel = 'noopener noreferrer';

          const iconClasses = Array.from(iconSpan.classList);
          const iconClass = iconClasses.find(c => c.startsWith('icon-'));
          if (iconClass) {
            const iconName = iconClass.replace('icon-', '');
            newLink.setAttribute('aria-label', iconName);
          }

          socialWrapper.appendChild(newLink);
        }
      });

      bottomSection.appendChild(socialWrapper);
      if (typeof _legalWrapper !== 'undefined') {
        bottomSection.appendChild(_legalWrapper);
      }
    }

    // Extract copyright text - paragraphs without links, pipes, or icons
    const copyrightParts = [];
    allParas.forEach(p => {
      const text = p.textContent.trim();
      const hasLinks = p.querySelector('a') !== null;
      const hasPipes = text.includes('|');
      const hasIcons = p.querySelector('span.icon') !== null;

      if (text && !hasLinks && !hasPipes && !hasIcons) {
        copyrightParts.push(text);
      }
    });

    if (copyrightParts.length > 0) {
      // Create separate divs for each copyright part (ICP and copyright text)
      copyrightParts.forEach((part, index) => {
        const copyDiv = document.createElement('div');
        if (index === 0) {
          copyDiv.classList.add('footer-copyright-icp');
        } else {
          copyDiv.classList.add('footer-copyright-text');
        }

        const p = document.createElement('p');
        p.textContent = part;
        copyDiv.appendChild(p);

        bottomSection.appendChild(copyDiv);
      });
    }

    footer.appendChild(bottomSection);
    block.appendChild(footer);

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading footer content:', error);
  }
}
