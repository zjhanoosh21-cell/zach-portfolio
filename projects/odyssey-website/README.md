# Odyssey Construction — Marketing Site

The public marketing site for a custom-home builder in Southeast Michigan — **live at
[chooseodyssey.com](https://chooseodyssey.com)**. Eight pages covering new construction,
remodeling, real estate, process, financing, FAQ, a project gallery, and contact.

Built for the same client as the [Draw Manager](../draw-manager/): the draw manager runs the
back office, this site brings in the work.

## Approach

- **No framework, on purpose** — hand-written HTML/CSS/JS. A builder's marketing site needs
  to be fast, indexable, and cheap to host forever; a static site on Vercel's edge delivers
  all three with zero maintenance surface.
- **SEO done properly** — per-page titles/descriptions, Open Graph tags, `sitemap.xml`,
  `robots.txt`, and service pages structured around what homeowners actually search for.
- **Real project photography** — a gallery of the builder's actual homes, images tuned for
  web weight.
- **Client-editable by design** — flat HTML means the next change is a text edit and a git
  push, not a CMS bill.

## Stack

HTML · CSS · vanilla JS · Vercel (static hosting + edge CDN)
