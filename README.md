# ali-pahlevani.github.io

Portfolio and CV of **Ali Pahlevani**, robotics software engineer (SLAM, sensor fusion, navigation).

Live at **https://ali-pahlevani.github.io/**

## What's inside

A single static page with no build step and no dependencies. It only needs a browser.

- **Hero:** a live SLAM simulation on a `<canvas>`. A robot explores a randomly generated floor plan, raycasts a simulated lidar, builds an occupancy grid, records a pose graph with loop closures, and drives to frontiers. Click or tap the map to set a navigation goal (A* path planning on the known map).
- **About, Experience, Projects, Skills, Contact** sections, with scroll-aware navigation, project filtering, live GitHub star counts, and copy-to-clipboard for email.
- Respects `prefers-reduced-motion`: the map renders fully explored and nothing moves on its own. The animation can also be paused, and it stops when the hero is off-screen.

```
├── index.html            # all sections live here
├── assets/
│   ├── css/style.css
│   ├── js/script.js      # nav, filters, stars, copy, and the SLAM simulation
│   ├── images/           # headshot, project screenshots, favicon, social card
│   └── files/CV.pdf      # downloadable CV
├── LICENSE
└── README.md
```

## Run locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Update content

- **Text:** edit `index.html`. Each section is marked with a comment (`<!-- ABOUT -->`, `<!-- EXPERIENCE -->` and so on).
- **CV:** replace `assets/files/CV.pdf`.
- **Projects:** each project is an `<article class="project">`. `data-cats` controls which filters it appears under (`slam`, `sim`, `tools`), and `data-stars="RepoName"` makes its star count update live from the GitHub API. If you add or move projects, update the counts on the filter buttons.
- **Colors and fonts:** the tokens at the top of `assets/css/style.css`.

## Deploy

GitHub Pages serves the `main` branch root. Push and the site updates within a minute or two.

## License

Code is MIT (see `LICENSE`). Personal content (text, photographs, screenshots, CV) © Ali Pahlevani, all rights reserved.
