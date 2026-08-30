# Bryson Loflin — personal academic site

A [Quarto](https://quarto.org) website. You write content in Markdown (`.qmd`)
files, Quarto renders them to a fast static HTML site, and you host it for free.
Everything is plain text you can edit in RStudio or any editor.

---

## 0. One-time setup

You need the **Quarto CLI** (the program that builds the site). It ships inside
recent versions of **RStudio**, so if your RStudio is up to date you may already
have it. To check, open a terminal and run:

```bash
quarto --version
```

If that prints a version number (1.4+), you're set. If it says "command not
found," install Quarto from <https://quarto.org/docs/get-started/> (pick the
macOS installer) and reopen your terminal.

> A copy is already installed on this Mac at `~/.local/quarto/bin/quarto`. The
> standard install above is cleaner long-term because it puts `quarto` on your PATH.

That's the only tool you need. No Node, no build system.

---

## 1. Preview the site while you edit

From this folder (`site/`), run:

```bash
quarto preview
```

This opens the site in your browser and **live-reloads** every time you save a
file. Press `Ctrl-C` in the terminal to stop. (In RStudio you can also open
`index.qmd` and click **Render**.)

To build the final site once without the live server:

```bash
quarto render
```

Output goes to `_site/` (git-ignored — you never edit it by hand).

---

## 2. The files you'll actually edit

| You want to… | Edit this |
|---|---|
| Change homepage text / tagline | `index.qmd` |
| Edit your bio | `about.qmd` |
| Edit research projects | `research.qmd` |
| Edit the CV page | `cv.qmd` |
| Edit publications | `publications.qmd` |
| Edit the fieldwork photo-essay | `fieldwork.qmd` |
| Edit contact info / social links | `contact.qmd` |
| Add a blog post | new folder in `posts/` (see below) |
| Change colors / fonts / design | `theme.scss` (colors/fonts) and `assets/css/site.css` (layout) |
| Change the top menu | `_quarto.yml` → `navbar` |

The design pieces (`<section class="section ...">`, `class="eyebrow"`, `h-xl`,
`btnx`, etc.) are defined in `assets/css/site.css`. Copy an existing block in a
`.qmd` file when you want the same look somewhere new.

> **One gotcha:** in the `.qmd` pages, the custom HTML blocks must start at the
> **left margin** (no leading spaces). Indented HTML gets shown as code. Plain
> Markdown paragraphs are fine to write normally.

---

## 3. Swap the hero photo (home page)

The home hero image is `assets/img/hero.jpg`. To change it, just replace that
file with any photo named `hero.jpg` (landscape, ideally 2000px+ wide). Or point
`index.qmd` at a different file — find this line and change the filename:

```html
<div class="hero__img" style="background-image:url('assets/img/hero.jpg')"></div>
```

Re-run `quarto render` (or keep `quarto preview` running).

---

## 4. Add or change gallery photos

The gallery is generated from your photo library by **`build-photos.sh`**. Open
it and you'll see a list like:

```
"Elegant_Trogon_1|trogon|Elegant Trogon|Trogon elegans|Chiricahua Mountains, Arizona"
#  source filename  | url slug | Common name  | Scientific    | Location
```

- **Add a photo:** add a line in that format. The first field is the filename
  (without `.jpg`) in your source folder; the rest become the caption.
- **Remove one:** delete its line.
- **Fix a caption/location:** edit the text after the slug.
- **Point at a different source folder:** change the `SRC=` path at the top.

Then run:

```bash
bash build-photos.sh    # resizes images + rebuilds the gallery
quarto render           # rebuilds the site
```

`build-photos.sh` writes web-sized copies into `assets/photos/`, thumbnails into
`assets/photos/thumbs/`, and the gallery markup into `assets/_gallery.html`
(which `photography.qmd` includes automatically). Your originals are never
touched.

---

## 5. Add a blog post ("Field Notes")

1. Make a new folder under `posts/`, e.g. `posts/first-field-season/`.
2. Add an `index.qmd` inside it with this header, then write in Markdown:

```markdown
---
title: "First field season in Gamboa"
description: "One line that shows on the blog list."
author: "Bryson Loflin"
date: "2026-08-01"
categories: [fieldwork, panama]
image: ../../assets/photos/thumbs/caiman.jpg   # optional thumbnail
---

Write your post here in plain Markdown. ## headings, **bold**, images, links —
all work normally.
```

3. `quarto render`. The post appears automatically on the **Field Notes** page,
   newest first. No other file to touch.

---

## 6. Update your CV

- **The PDF download:** replace `assets/cv/BrysonLoflin_CV.pdf` with your new file
  (keep the same name and it just works).
- **The on-page CV:** edit `cv.qmd`.

> ⚠️ **Your current PDF is out of date** (see the note at the bottom of the CV
> page and the summary I gave you). Update it before sharing the site widely.

---

## 7. Add your social / scholarly links

I couldn't find these on your computer, so they're placeholders. Open
`contact.qmd` (and `publications.qmd`) and replace the `href="#"` values for
Google Scholar, ORCID, GitHub, iNaturalist, and Bluesky with your real URLs.

---

## 8. Publish it (free)

The easiest path is **GitHub Pages** via Quarto's one-command publisher.

**First time:**
1. Create a free account at <https://github.com> if you don't have one.
2. Create a new **empty** repository. For a site at
   `https://<username>.github.io`, name the repo exactly
   `<username>.github.io`. (Any other name puts the site at
   `https://<username>.github.io/<repo>/` — that also works, just a longer URL.)
3. In this folder, connect it and publish:

```bash
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main

quarto publish gh-pages
```

`quarto publish gh-pages` builds the site and pushes it to a `gh-pages` branch;
GitHub serves it within a minute or two. It also remembers the target, so from
then on **publishing an update is just:**

```bash
quarto publish gh-pages
```

**Alternatives:** [Netlify](https://quarto.org/docs/publishing/netlify.html) and
[Quarto Pub](https://quarto.org/docs/publishing/quarto-pub.html) are equally
easy (`quarto publish netlify` / `quarto publish quarto-pub`) if you'd rather not
use GitHub.

> If you use a project repo (not `<username>.github.io`), also set the site path:
> in `_quarto.yml` change `site-url` to your real URL. Not needed for the
> `<username>.github.io` case.

---

## 9. Everyday workflow, in one line

```
edit a .qmd  →  quarto preview (to see it)  →  quarto publish gh-pages (to ship it)
```

That's the whole loop.

---

## Project map

```
site/
├── _quarto.yml          # site config: menu, theme, metadata
├── index.qmd            # home page (custom hero)
├── about.qmd research.qmd publications.qmd cv.qmd
├── photography.qmd fieldwork.qmd contact.qmd blog.qmd
├── posts/               # blog posts (one folder each)
├── theme.scss           # colors + fonts (Bootstrap variables)
├── assets/
│   ├── css/site.css    # all the custom layout/design CSS
│   ├── html/site-js.html# scroll-reveal + photo lightbox
│   ├── img/             # hero, portrait, essay images, favicon
│   ├── photos/          # generated gallery images (+ thumbs/)
│   ├── _gallery.html    # generated gallery markup (don't hand-edit)
│   └── cv/              # CV PDF
└── build-photos.sh      # regenerates gallery images + captions
```
