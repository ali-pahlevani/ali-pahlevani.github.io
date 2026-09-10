# Project images

One folder per project. Whatever is in a folder becomes that project's slider on
the site, in order. No images means the project shows as text only; one image
means a plain picture with no slider controls.

## Adding pictures (the easy way)

Name the files by number and drop them in the project's folder:

```
assets/images/projects/rubi/1.webp
assets/images/projects/rubi/2.png
assets/images/projects/rubi/3.jpg
```

The site looks for `1`, `2`, `3` … and stops at the first missing number, so
**keep the numbering unbroken**. Deleting `2.png` from the list above would hide
`3.jpg` as well; renumber after removing one. `.webp`, `.jpg`, `.jpeg` and
`.png` all work, and you can mix them.

## Keeping your own filenames

If you would rather not rename anything, put an `images.json` in the folder
listing the files in the order you want:

```json
[
  "rviz-overview.png",
  { "src": "qos-detector.png", "alt": "RUBI showing a QoS mismatch between two nodes" }
]
```

When `images.json` exists it wins, and numbered files are ignored. The `alt`
text is what screen readers and search engines read, so it is worth writing for
your best pictures; without it the site falls back to "<project name>, picture 2".

To generate the file for a folder you have already filled:

```bash
python3 tools/build-image-manifests.py          # every project
python3 tools/build-image-manifests.py rubi     # just one
```

It sorts numerically, keeps any `alt` text you added, and can be re-run whenever
you add pictures.

## Sizing

Aim for about 1400px wide and under ~300KB each. WebP gives the smallest files.
To convert and shrink a picture:

```bash
python3 -c "from PIL import Image; im=Image.open('shot.png').convert('RGB'); \
im.thumbnail((1400,1400)); im.save('1.webp','WEBP',quality=80,method=6)"
```

Pictures load only when a visitor scrolls to that project, so a few extra
pictures per project cost nothing on page load.
