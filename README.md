# ali-pahlevani.github.io

Portfolio and CV of **Ali Pahlevani**, robotics software engineer (SLAM, sensor fusion, navigation).

Live at **https://ali-pahlevani.github.io/**

## What's inside

A single static page with no build step and no dependencies. It only needs a browser.

- **Hero:** a live SLAM simulation on a `<canvas>`. A robot explores a randomly generated floor plan, raycasts a simulated lidar, builds an occupancy grid, records a pose graph with loop closures, and drives to frontiers. Click or tap the map to set a navigation goal (Dijkstra path planning on the known map).
- **About, Experience, Projects, Skills, Contact**, with scroll-aware navigation, 16 projects with per-project image sliders, filters, live GitHub star counts, and copy-to-clipboard for email.
- **Motion:** a trail that draws down the page as you scroll with a waypoint per section, lidar-sweep heading reveals, count-ups, card tilt and parallax, a faint grid that scans around the cursor, a sphere in place of the mouse pointer, and the robot arriving at a goal in Contact.
- **One motion switch:** the hero's pause button stops everything that moves on its own, and the choice is remembered. Everything is off by default for visitors who ask for reduced motion.

```
├── index.html                     # all sections live here
├── assets/
│   ├── css/style.css
│   ├── js/script.js               # page behaviour + the hero SLAM simulation
│   ├── js/motion.js               # galleries + scroll-driven motion
│   ├── images/projects/<slug>/    # one folder of pictures per project
│   ├── images/                    # headshot, favicon, social card
│   └── files/CV.pdf               # downloadable CV
├── tools/build-image-manifests.py # optional, for captions and custom filenames
├── LICENSE
└── README.md
```

## Run locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Update content

- **Text:** edit `index.html`. Each section is marked with a comment (`<!-- ABOUT -->`, `<!-- PROJECTS -->` and so on).
- **CV:** replace `assets/files/CV.pdf`.
- **Project pictures:** drop numbered files (`1.webp`, `2.jpg`, …) into `assets/images/projects/<slug>/` and they appear as that project's slider. See [assets/images/projects/README.md](assets/images/projects/README.md) for captions and custom filenames.
- **Projects:** each one is an `<article class="project">`. `data-cats` controls which filters it appears under (`slam`, `sim`, `tools`, `robots`, `research`), `data-gallery` points at its image folder, and `data-stars="RepoName"` makes its star count update live from GitHub. If you add or remove a project, update the counts on the filter buttons.
- **Colours and fonts:** the tokens at the top of `assets/css/style.css`. The palette is Amethyst Night: deep violet ground, lilac text, amethyst accent, gold for data. Every text pair clears WCAG AA contrast; re-check if you change them.

## Deploy

GitHub Pages serves the `main` branch root. Push and the site updates within a minute or two.

## License

Code is MIT (see `LICENSE`). Personal content (text, photographs, screenshots, CV) © Ali Pahlevani, all rights reserved.
