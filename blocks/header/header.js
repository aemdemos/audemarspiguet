import { getMetadata, decorateIcons } from "../../scripts/aem.js";
import { loadFragment } from "../fragment/fragment.js";

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia("(min-width: 1440px)");

function closeOnEscape(e) {
  if (e.code === "Escape") {
    const nav = document.getElementById("nav");
    const navSections = nav.querySelector(".nav-sections");
    const navSectionExpanded = navSections.querySelector(
      '[aria-expanded="true"]'
    );
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector("button").focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    // Don't close if mobile submenu panel is open
    const mobileSubmenuPanel = document.querySelector(".mobile-submenu-panel");
    if (mobileSubmenuPanel) {
      return;
    }

    const navSections = nav.querySelector(".nav-sections");
    const navSectionExpanded = navSections.querySelector(
      '[aria-expanded="true"]'
    );
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === "nav-drop";
  if (isNavDrop && (e.code === "Enter" || e.code === "Space")) {
    const dropExpanded = focused.getAttribute("aria-expanded") === "true";
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest(".nav-sections"));
    focused.setAttribute("aria-expanded", dropExpanded ? "false" : "true");
  }
}

function focusNavSection() {
  document.activeElement.addEventListener("keydown", openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections
    .querySelectorAll(".nav-sections .default-content-wrapper > ul > li")
    .forEach((section) => {
      section.setAttribute("aria-expanded", expanded);
    });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded =
    forceExpanded !== null
      ? !forceExpanded
      : nav.getAttribute("aria-expanded") === "true";
  const button = nav.querySelector(".nav-hamburger button");
  const isTablet = window.matchMedia(
    "(min-width: 768px) and (max-width: 1024px)"
  );
  if (expanded && isTablet.matches) {
    // Hamburger icon switches immediately
    nav.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Open navigation");
    // Animate menu close
    navSections.classList.add("closing");
    navSections.style.transform = "translateY(-100%)";
    setTimeout(() => {
      navSections.classList.remove("closing");
      navSections.style.transform = "";
      toggleAllNavSections(navSections, false);
    }, 700); // match CSS transition duration
  } else {
    document.body.style.overflowY =
      expanded || isDesktop.matches ? "" : "hidden";
    nav.setAttribute("aria-expanded", expanded ? "false" : "true");
    toggleAllNavSections(navSections, false);
    button.setAttribute(
      "aria-label",
      expanded ? "Open navigation" : "Close navigation"
    );
    // When closing the menu, also remove any open mobile submenu panels
    if (expanded && window.innerWidth < 768) {
      document
        .querySelectorAll(".mobile-submenu-panel")
        .forEach((panel) => panel.remove());
      // Also show nav-tools again
      const navTools = nav.querySelector(".nav-tools");
      if (navTools) navTools.classList.remove("nav-tools-hidden");
    }
  }
  // enable nav dropdown keyboard accessibility
  const navDrops = navSections ? navSections.querySelectorAll(".nav-drop") : [];
  if (isDesktop.matches) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute("tabindex")) {
        drop.setAttribute("tabindex", 0);
        drop.addEventListener("focus", focusNavSection);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute("tabindex");
      drop.removeEventListener("focus", focusNavSection);
    });
  }
  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    window.addEventListener("keydown", closeOnEscape);
    nav.addEventListener("focusout", closeOnFocusLost);
  } else {
    window.removeEventListener("keydown", closeOnEscape);
    nav.removeEventListener("focusout", closeOnFocusLost);
  }
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata("nav");
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : "/nav";
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = "";
  const nav = document.createElement("nav");
  nav.id = "nav";
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  // Add classes first so we can query by class name
  const classes = ["brand", "sections", "tools"];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  // Process nav-tools regardless of restructuring
  const navTools = nav.querySelector(".nav-tools");
  if (navTools) {
    // Wrap plain text nodes in nav-tools-text spans for proper styling
    navTools.querySelectorAll("a").forEach((a) => {
      Array.from(a.childNodes).forEach((node) => {
        if (
          node.nodeType === Node.TEXT_NODE &&
          node.textContent.trim().length > 0
        ) {
          const span = document.createElement("span");
          span.className = "nav-tools-text";
          span.textContent = node.textContent;
          a.replaceChild(span, node);
        }
      });
    });
  }

  // Fix structure if nav content is not properly separated or if nav-sections has h3 elements
  const navSections = nav.querySelector(".nav-sections");
  const navBrandCheck = nav.querySelector(".nav-brand");
  const needsRestructure =
    nav.children.length < 3 ||
    (navSections && navSections.querySelector(".default-content-wrapper h3")) ||
    (navBrandCheck && navBrandCheck.querySelector("h3"));

  if (needsRestructure) {
    // If we have many children, they're all flat - need to restructure from the nav itself
    const firstDiv = nav.children.length < 3 ? nav.children[0] : nav;
    const secondDiv = nav.children.length < 3 ? nav.children[1] : null;

    // Check if we need to restructure from scratch or just fix nav-sections
    if (firstDiv && firstDiv.querySelector("h3")) {
      // All content is in first div, need to restructure
      const brandDiv = document.createElement("div");
      const sectionsDiv = document.createElement("div");
      const toolsDiv = document.createElement("div");

      // If content is wrapped in default-content-wrapper, unwrap it
      const contentWrapper = firstDiv.querySelector(".default-content-wrapper");
      const contentSource = contentWrapper || firstDiv;

      // Move logos to brand (main logo + 150 years logo)
      // Only take paragraphs that come before the first h3
      const firstH3 = contentSource.querySelector("h3");
      const logoParagraphs = [];

      if (firstH3) {
        let currentEl = contentSource.firstElementChild;
        while (currentEl && currentEl !== firstH3) {
          if (
            currentEl.tagName === "P" &&
            (currentEl.querySelector("img") || currentEl.querySelector(".icon"))
          ) {
            logoParagraphs.push(currentEl);
          }
          currentEl = currentEl.nextElementSibling;
        }
      }

      logoParagraphs.forEach((logoPara) => {
        const clonedPara = logoPara.cloneNode(true);
        brandDiv.append(clonedPara);
      });

      // The 150 years logo uses icon syntax and will be handled by EDS automatically
      // If not present, manually add it
      if (logoParagraphs.length < 2) {
        // Add 150 years logo dynamically or via other logic here if needed
        // (No hardcoded SVG path)
      }

      // Move navigation sections (h3 + content) to sections
      // Create proper structure: default-content-wrapper > ul > li
      const wrapper = document.createElement("div");
      wrapper.className = "default-content-wrapper";
      const ul = document.createElement("ul");

      const h3Elements = contentSource.querySelectorAll("h3");
      const allH3s = Array.from(h3Elements);
      const lastH3 = allH3s[allH3s.length - 1];

      h3Elements.forEach((h3) => {
        const li = document.createElement("li");

        // Peek ahead to see if this is a direct link section (single paragraph with just a link, no submenu)
        let directLinkUrl = null;
        const firstNextEl = h3.nextElementSibling;

        // Special case for Stories - always treat as direct link
        if (h3.textContent.trim() === "Stories") {
          // Check if it's a UL with a single item
          if (firstNextEl && firstNextEl.tagName === "UL") {
            const listItems = firstNextEl.querySelectorAll("li");
            if (listItems.length === 1) {
              const linkInLi = listItems[0].querySelector("a");
              if (linkInLi) {
                directLinkUrl = linkInLi.href;
              }
            }
          } else if (firstNextEl && firstNextEl.tagName === "P") {
            const linkInPara = firstNextEl.querySelector("a");
            if (linkInPara) {
              directLinkUrl = linkInPara.href;
            }
          }
        } else if (firstNextEl && firstNextEl.tagName === "P") {
          const linkInPara = firstNextEl.querySelector("a");
          const hasOnlyLink =
            linkInPara &&
            !firstNextEl.querySelector("em") &&
            !firstNextEl.querySelector("img") &&
            firstNextEl.textContent.trim() === linkInPara.textContent.trim();
          const secondNextEl = firstNextEl.nextElementSibling;
          const isFollowedByH3 = secondNextEl && secondNextEl.tagName === "H3";

          if (hasOnlyLink && isFollowedByH3) {
            directLinkUrl = linkInPara.href;
          }
        }

        // Add the h3 text as a link at top level
        const topLink = document.createElement("a");
        topLink.href = directLinkUrl || "#";
        topLink.textContent = h3.textContent;
        li.append(topLink);

        // Collect submenu content (ul, images, emphasis) - skip if this is a direct link
        if (!directLinkUrl) {
          let nextEl = h3.nextElementSibling;
          while (nextEl && nextEl.tagName !== "H3") {
            const current = nextEl;
            nextEl = nextEl.nextElementSibling;

            // Skip tool paragraphs from the last h3 section
            // Tool paragraphs are those with icon spans (no regular images, no emphasized text)
            if (
              h3 === lastH3 &&
              current.tagName === "P" &&
              current.querySelector("a") &&
              current.querySelector(".icon") &&
              !current.querySelector("em")
            ) {
              // This is a tool paragraph, skip it
              continue;
            }

            li.append(current.cloneNode(true));
          }

          // Add expand/collapse button for mobile menu items with submenus
          const expandButton = document.createElement("button");
          expandButton.className = "menu-expand-btn";
          expandButton.setAttribute(
            "aria-label",
            `View ${h3.textContent} submenu`
          );
          // Use a right chevron SVG for a modern next button look
          expandButton.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;"><path d="M7 5L12 10L7 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
          li.append(expandButton);
        }

        ul.append(li);
      });

      wrapper.append(ul);
      sectionsDiv.append(wrapper);

      // Tools are paragraphs with links after all h3 sections
      // Use the lastH3 already declared above
      if (lastH3) {
        // Find where the last h3 section ends (after all its content)
        let currentEl = lastH3.nextElementSibling;
        const lastH3Content = [];

        // Collect all elements that belong to the last h3 section
        while (currentEl) {
          if (
            currentEl.tagName === "P" &&
            currentEl.querySelector("img") &&
            !currentEl.querySelector(".icon")
          ) {
            // Image paragraphs belong to the section (but not icon paragraphs)
            lastH3Content.push(currentEl);
            currentEl = currentEl.nextElementSibling;
          } else if (
            currentEl.tagName === "UL" ||
            (currentEl.tagName === "P" && currentEl.querySelector("em"))
          ) {
            // Lists and subtitle paragraphs belong to the section
            lastH3Content.push(currentEl);
            currentEl = currentEl.nextElementSibling;
          } else {
            // This is after the section content - could be tools
            break;
          }
        }

        // Now collect remaining paragraphs as tools (paragraphs with icon spans)
        while (currentEl) {
          if (
            currentEl.tagName === "P" &&
            currentEl.querySelector("a") &&
            currentEl.querySelector(".icon")
          ) {
            // Clone and wrap plain text in nav-tools links
            const toolPara = currentEl.cloneNode(true);
            toolPara.querySelectorAll("a").forEach((a) => {
              // For each child node of the link
              Array.from(a.childNodes).forEach((node) => {
                if (
                  node.nodeType === Node.TEXT_NODE &&
                  node.textContent.trim().length > 0
                ) {
                  const span = document.createElement("span");
                  span.className = "nav-tools-text";
                  span.textContent = node.textContent;
                  a.replaceChild(span, node);
                }
              });
            });
            toolsDiv.append(toolPara);
          }
          currentEl = currentEl.nextElementSibling;
        }
      }

      // If second div exists, also add its content to tools
      if (secondDiv) {
        Array.from(secondDiv.children).forEach((child) => {
          toolsDiv.append(child.cloneNode(true));
        });
      }

      // Replace structure
      nav.innerHTML = "";
      nav.append(brandDiv, sectionsDiv, toolsDiv);

      // Re-apply classes after restructuring
      brandDiv.classList.add("nav-brand");
      sectionsDiv.classList.add("nav-sections");
      toolsDiv.classList.add("nav-tools");
    } else if (
      navSections &&
      navSections.querySelector(".default-content-wrapper h3")
    ) {
      // Nav-sections exists but has h3 elements, need to restructure just the sections
      const wrapper = navSections.querySelector(".default-content-wrapper");
      const ul = document.createElement("ul");

      const h3Elements = wrapper.querySelectorAll("h3");
      h3Elements.forEach((h3) => {
        const li = document.createElement("li");

        // Peek ahead to see if this is a direct link section (single paragraph with just a link, no submenu)
        let directLinkUrl = null;
        const firstNextEl = h3.nextElementSibling;

        // Special case for Stories - always treat as direct link
        if (h3.textContent.trim() === "Stories") {
          // Check if it's a UL with a single item
          if (firstNextEl && firstNextEl.tagName === "UL") {
            const listItems = firstNextEl.querySelectorAll("li");
            if (listItems.length === 1) {
              const linkInLi = listItems[0].querySelector("a");
              if (linkInLi) {
                directLinkUrl = linkInLi.href;
              }
            }
          } else if (firstNextEl && firstNextEl.tagName === "P") {
            const linkInPara = firstNextEl.querySelector("a");
            if (linkInPara) {
              directLinkUrl = linkInPara.href;
            }
          }
        } else if (firstNextEl && firstNextEl.tagName === "P") {
          const linkInPara = firstNextEl.querySelector("a");
          const hasOnlyLink =
            linkInPara &&
            !firstNextEl.querySelector("em") &&
            !firstNextEl.querySelector("img") &&
            firstNextEl.textContent.trim() === linkInPara.textContent.trim();
          const secondNextEl = firstNextEl.nextElementSibling;
          const isFollowedByH3 = secondNextEl && secondNextEl.tagName === "H3";

          if (hasOnlyLink && isFollowedByH3) {
            directLinkUrl = linkInPara.href;
          }
        }

        // Add the h3 text as a link at top level
        const topLink = document.createElement("a");
        topLink.href = directLinkUrl || "#";
        topLink.textContent = h3.textContent;
        li.append(topLink);

        // Collect submenu content (ul, images, emphasis) - skip if this is a direct link
        if (!directLinkUrl) {
          let nextEl = h3.nextElementSibling;
          while (nextEl && nextEl.tagName !== "H3") {
            const current = nextEl;
            nextEl = nextEl.nextElementSibling;
            li.append(current.cloneNode(true));
          }
        }

        ul.append(li);
      });

      // Replace wrapper content
      wrapper.innerHTML = "";
      wrapper.append(ul);
    }
  }

  const navBrand = nav.querySelector(".nav-brand");
  if (navBrand) {
    const brandLink = navBrand.querySelector(".button");
    if (brandLink) {
      brandLink.className = "";
      brandLink.closest(".button-container").className = "";
    }

    // Ensure logo images are properly set up
    const paragraphsWithLogos = Array.from(
      navBrand.querySelectorAll("p")
    ).filter((p) => p.querySelector("img") || p.querySelector(".icon"));

    if (paragraphsWithLogos.length > 0) {
      paragraphsWithLogos.forEach((p) => {
        const img = p.querySelector("img");
        if (img) {
          // Add class names to help with responsive behavior based on src
          if (img.src && img.src.includes("logo-mob")) {
            img.classList.add("logo-mobile");
          } else if (img.src && img.src.includes("logo-desk")) {
            img.classList.add("logo-desktop");
          }
        }
      });
    }
  }

  // Decorate only icons that don't already have images (avoid duplicates)
  const undecoratedIcons = nav.querySelectorAll("span.icon:not(:has(img))");
  undecoratedIcons.forEach((span) => {
    const iconName = Array.from(span.classList).find((c) =>
      c.startsWith("icon-")
    );
    if (iconName) {
      const img = document.createElement("img");
      img.dataset.iconName = iconName.substring(5);
      img.src = `${window.hlx.codeBasePath}/icons/${iconName.substring(5)}.svg`;
      img.alt = "";
      img.loading = "lazy";
      img.width = 16;
      img.height = 16;
      span.append(img);
    }
  });

  // Re-query navSections after potential restructuring
  const finalNavSections = nav.querySelector(".nav-sections");

  // Extract 150 Years logo from brand section (third paragraph)
  const nav150Years = document.createElement("div");
  nav150Years.className = "nav-150years";

  const navBrandSection = nav.querySelector(".nav-brand");
  if (navBrandSection) {
    // Find all paragraphs with links in brand section
    const brandParagraphs = navBrandSection.querySelectorAll("p:has(a)");

    // Get the third paragraph (index 2) if it exists
    if (brandParagraphs.length >= 3) {
      const year150Para = brandParagraphs[2];
      const year150Link = year150Para.querySelector("a");

      if (year150Link) {
        // Clone the link and add it to nav150Years div
        nav150Years.appendChild(year150Link.cloneNode(true));
        // Remove the third paragraph from brand section
        year150Para.remove();
      }
    } else if (brandParagraphs.length > 1) {
      // Fallback: use second paragraph if third doesn't exist
      const year150Link = brandParagraphs[1].querySelector("a");
      if (year150Link && year150Link.href.includes("150years")) {
        nav150Years.appendChild(year150Link.cloneNode(true));
        brandParagraphs[1].remove();
      }
    }
  }

  // Insert 150 Years logo as the FIRST child of nav (before everything else)
  if (nav150Years.children.length > 0) {
    nav.insertBefore(nav150Years, nav.firstChild);
  }

  if (finalNavSections) {
    const isTablet = window.matchMedia(
      "(min-width: 768px) and (max-width: 1024px)"
    );

    finalNavSections
      .querySelectorAll(":scope .default-content-wrapper > ul > li")
      .forEach((navSection) => {
        if (navSection.querySelector("ul")) {
          navSection.classList.add("nav-drop");
          // Initialize aria-expanded: true for tablet (all open), false for mobile (all closed)
          navSection.setAttribute(
            "aria-expanded",
            isTablet.matches ? "true" : "false"
          );
        }

        // Add click handler for the expand button
        const expandBtn = navSection.querySelector(".menu-expand-btn");
        if (expandBtn) {
          expandBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isDesktop.matches) {
              // Mobile: show submenu panel on button click
              // eslint-disable-next-line no-use-before-define
              showMobileSubmenuPanel(navSection, finalNavSections);
            }
          });
        }

        navSection.addEventListener("click", (e) => {
          const nav = document.getElementById("nav");
          const navTools = nav ? nav.querySelector(".nav-tools") : null;
          // Only hide nav-tools if this li has a submenu (nav-drop) and is mobile
          if (
            window.innerWidth < 768 &&
            navTools &&
            navSection.classList.contains("nav-drop")
          ) {
            navTools.classList.add("nav-tools-hidden");
          }
          if (isDesktop.matches) {
            // If this is a simple link without submenu, navigate to it
            const hasSubmenu = navSection.classList.contains("nav-drop");
            if (!hasSubmenu) {
              const link = navSection.querySelector("a");
              if (link && link.href && link.href !== "#") {
                window.location.href = link.href;
                return;
              }
            }

            const expanded =
              navSection.getAttribute("aria-expanded") === "true";
            const currentExpanded = finalNavSections.querySelector(
              '[aria-expanded="true"]'
            );
            const wasAnyExpanded = currentExpanded !== null;

            // If clicking the same menu that's already open, close it
            if (expanded) {
              navSection.classList.remove("slide-in", "slide-out");
              toggleAllNavSections(finalNavSections);
              return;
            }

            // If switching between menus, slide out old and slide in new
            if (wasAnyExpanded && currentExpanded !== navSection) {
              // Close old menu FIRST to remove aria-expanded state before animation
              currentExpanded.setAttribute("aria-expanded", "false");
              // Add slide-out class to current menu for animation
              currentExpanded.classList.add("slide-out");

              // Set the new menu as expanded immediately (keeps white bg visible)
              navSection.setAttribute("aria-expanded", "true");
              navSection.classList.add("slide-in");

              // After slide-out animation completes, remove old menu's slide-out class
              setTimeout(() => {
                // Remove slide-out class from old menu
                currentExpanded.classList.remove("slide-out");

                // Remove slide-in class after animations complete
                setTimeout(() => {
                  navSection.classList.remove("slide-in");
                }, 400);
              }, 300);
            } else {
              // No menu was open, open immediately
              navSection.setAttribute("aria-expanded", "true");
            }
          } else {
            // Mobile: handle menu item click
            const hasSubmenu = navSection.classList.contains("nav-drop");
            if (hasSubmenu) {
              // For menu items with submenus, show submenu panel
              // eslint-disable-next-line no-use-before-define
              showMobileSubmenuPanel(navSection, finalNavSections);
            } else {
              // For items without submenus, navigate
              const link = navSection.querySelector("a");
              if (link && link.href && link.href !== "#") {
                window.location.href = link.href;
              }
            }
          }
        });
      });
  }

  // hamburger for mobile
  const hamburger = document.createElement("div");
  hamburger.classList.add("nav-hamburger");
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener("click", () => toggleMenu(nav, finalNavSections));

  // Add separator bar | after 150 years logo
  const separator = document.createElement("span");
  separator.className = "nav-hamburger-separator";
  separator.textContent = "|";

  // Always insert hamburger and separator after the 150 years logo if it exists
  const nav150YearsEl = nav.querySelector(".nav-150years");
  if (nav150YearsEl) {
    if (nav150YearsEl.nextSibling) {
      nav.insertBefore(separator, nav150YearsEl.nextSibling);
      nav.insertBefore(hamburger, separator.nextSibling);
    } else {
      nav.appendChild(separator);
      nav.appendChild(hamburger);
    }
  } else {
    // fallback: insert before nav-brand if 150 years not found
    const navBrandEl = nav.querySelector(".nav-brand");
    if (navBrandEl) {
      nav.insertBefore(separator, navBrandEl);
      nav.insertBefore(hamburger, navBrandEl);
    }
  }
  nav.setAttribute("aria-expanded", "false");
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, finalNavSections, isDesktop.matches);
  isDesktop.addEventListener("change", () =>
    toggleMenu(nav, finalNavSections, isDesktop.matches)
  );

  const navWrapper = document.createElement("div");
  navWrapper.className = "nav-wrapper";
  navWrapper.append(nav);
  block.append(navWrapper);
}

/**
 * Shows a mobile submenu panel that slides in from the left
 * @param {Element} navSection The menu item that was clicked
 * @param {Element} navSections The nav sections container
 */
function showMobileSubmenuPanel(navSection, navSections) {
  const menuTitle = navSection.querySelector("a")?.textContent || "";
  const submenu = navSection.querySelector("ul");

  if (!submenu) return;

  // Prevent opening multiple panels: if a panel exists, do nothing
  let panel = navSections.querySelector(".mobile-submenu-panel");
  if (panel) {
    return;
  }

  // Create the submenu panel
  panel = document.createElement("div");
  panel.className = "mobile-submenu-panel";

  // Create submenu header with back button and title
  const submenuHeader = document.createElement("div");
  submenuHeader.className = "submenu-header";

  const backBtn = document.createElement("button");
  backBtn.className = "submenu-back-btn";
  backBtn.setAttribute("aria-label", "Back to menu");
  backBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;"><path d="M13 5L8 10L13 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  backBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    panel.classList.remove("slide-in");
    panel.classList.add("slide-out");
    setTimeout(() => {
      panel.remove();
      // Reset aria-expanded for the menu item but keep main menu open
      navSection.setAttribute("aria-expanded", "false");
      // Show nav-tools again when going back from submenu (mobile only)
      const nav = document.getElementById("nav");
      const navTools = nav ? nav.querySelector(".nav-tools") : null;
      if (window.innerWidth < 768 && navTools) {
        navTools.classList.remove("nav-tools-hidden");
      }
    }, 300);
  });

  const submenuTitle = document.createElement("div");
  submenuTitle.className = "submenu-title";
  submenuTitle.textContent = menuTitle;

  submenuHeader.append(backBtn, submenuTitle);

  // Create submenu content
  const submenuContent = document.createElement("div");
  submenuContent.className = "submenu-content";

  // Clone the submenu items
  const submenuItems = document.createElement("ul");
  submenu.querySelectorAll("li").forEach((item) => {
    submenuItems.append(item.cloneNode(true));
  });
  submenuContent.append(submenuItems);

  panel.append(submenuHeader, submenuContent);

  // Insert panel into nav sections
  navSections.parentElement.insertBefore(panel, navSections);

  // Trigger slide-in animation
  setTimeout(() => {
    panel.classList.add("slide-in");
  }, 10);
  // Hide nav-tools when submenu panel is shown (mobile only)
  const nav = document.getElementById("nav");
  const navTools = nav ? nav.querySelector(".nav-tools") : null;
  if (window.innerWidth < 768 && navTools) {
    navTools.classList.add("nav-tools-hidden");
  }
}

function moveNavToolsForMobileMenu(nav) {
  const navBrand = nav.querySelector(".nav-brand");
  const navSections = nav.querySelector(".nav-sections");
  const navTools = nav.querySelector(".nav-tools");
  if (window.innerWidth <= 768) {
    if (nav.getAttribute("aria-expanded") === "true") {
      if (
        navSections &&
        navTools &&
        navTools.nextElementSibling !== navSections
      ) {
        navSections.parentNode.insertBefore(navTools, navSections.nextSibling);
      }
    } else {
      // Restore nav-tools to its original position after nav-brand
      if (
        navBrand &&
        navTools &&
        navTools.previousElementSibling !== navBrand
      ) {
        navBrand.parentNode.insertBefore(navTools, navBrand.nextSibling);
      }
    }
  }
}

// Close entire menu when mobile submenu panel close button is clicked
function closeMobileMenu(nav) {
  nav.setAttribute("aria-expanded", "false");
  // Remove all mobile submenu panels
  document
    .querySelectorAll(".mobile-submenu-panel")
    .forEach((panel) => panel.remove());
  // Show nav-tools again when menu is closed
  const navTools = nav.querySelector(".nav-tools");
  if (navTools) {
    navTools.classList.remove("nav-tools-hidden");
  }
}

document.addEventListener("click", function (e) {
  if (
    window.innerWidth <= 768 &&
    e.target.classList.contains("submenu-back-btn")
  ) {
    const nav = document.getElementById("nav");
    if (nav) closeMobileMenu(nav);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  const nav = document.getElementById("nav");
  if (nav) moveNavToolsForMobileMenu(nav);
});
window.addEventListener("resize", () => {
  const nav = document.getElementById("nav");
  if (nav) moveNavToolsForMobileMenu(nav);
});

// Also run on hamburger open/close
const nav = document.getElementById("nav");
if (nav) {
  const observer = new MutationObserver(() => moveNavToolsForMobileMenu(nav));
  observer.observe(nav, {
    attributes: true,
    attributeFilter: ["aria-expanded"],
  });
}
