# themes

a theme is a folder: `theme.json` (name, author, description) + `theme.css`. the css sets variables on `:root`:

```
--bg --bg2 --panel --line   backgrounds and borders
--fg --muted                text
--accent --accent2          highlight, star
--radius --font --mono      shape and type
--card-glow                 box-shadow for the focused card
```

anything else in the css is fair game (crt adds scanlines with `body::after`). drop a folder in here, it shows up in the theme picker.
