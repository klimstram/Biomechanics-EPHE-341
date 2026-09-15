# EPHE 341 — Sensors and Data Acquisition

A self-contained reveal.js deck. No build step, no network: open `index.html` and it runs.

```
index.html        the 39 slides
theme.css         both themes and every widget's styling
deck-core.js      the drawing and UI helpers (shared with the other lectures)
sensors.js        this lecture's nine interactive figures
deck-tools.js     the toolbar along the bottom
annotate.js       writing on the slides
fit.js            keeps every slide inside its own page, on screen and in print
reveal/           reveal.js 5.2.1, vendored
assets/           the photographs and diagrams lifted from the original deck
handout.pdf       a printed copy
```

## The interactive figures

Twenty-six figures on the slides, from nine widgets. Everything is drawn to a canvas from
code — there are no plotting libraries and no images of graphs.

| widget | what it does |
| --- | --- |
| `strain` | Bend a cantilever with a force slider and watch ε → ΔR → V follow it, with the arithmetic beside the picture. "Wobble the beam" drives it from a sine and draws a live trace against the Tension / Rest / Compression lines. |
| `sampling` | The analog signal and the sampled one, side by side. Drop the rate below two samples per cycle and "Join the dots" shows you a wave that was never there. |
| `calib` | Hang 25, 50 and 75 N on the sensor — the numbers are the ones in the lecture's worked example — and it least-squares fits V = mF + b. `data-use="1"` adds a voltage slider that converts back to newtons; `data-mode="poly"` makes the sensor non-linear so the straight line visibly fails. |
| `multisensor` | One DAQ, up to six sensors of different kinds. Every channel's sample count falls as you add sensors, and the skew toggle shows that a "simultaneous" set of samples is nothing of the sort. |
| `adclimits` | All three A/D limits in one figure: the range window with a clipping counter, the quantisation steps from 1 to 12 bits, and the sample rate. An optional gain slider shows what the amplifier is for. |
| `samplehold` | Conversion windows drawn on the signal. Turn the hold off and the converter lands on whatever the voltage happened to be when it finished, with the worst error reported. |
| `hysteresis` | Loading and unloading curves, the gap between them at 50 N, and what that gap costs in newtons if you calibrate with one equation. |
| `drift` | A constant 25 N force and a voltage that slides anyway, put through the lecture's own calibration so the error comes out in newtons. |
| `daqchain` | The signal chain as seven boxes; `data-stage` lights the first N. It builds across the lecture exactly as the original PowerPoint did. |

## Writing on the slides

`A` for the pen, `D` for a blackboard, `Esc` to put them away — the toolbar has the same
controls. Notes are kept in this browser, per site, and are not in the repository. They print
with the slides unless you add `&clean`.

## The handout

Open `index.html?print-pdf` and print. Tick **Background graphics** and give the page a couple
of seconds before printing so the figures settle. `handout.pdf` here is a pre-made copy.

## The numbers in it

Everything quantitative on the slides is the original lecture's:

- calibration: 25 N → 5.0 V, 50 N → 6.5 V, 75 N → 8.0 V, giving m = 0.06 V/N and b = 3.5 V,
  and 6 V → 41.6 N
- multiplexing: 100 Hz ÷ 8 channels = 12.5 Hz
- resolution: 10 V ÷ 4 095 steps = 0.002 44 V
- bits: 8 → 256, 12 → 4 096, 16 → 65 536

The strain gauge figure uses a gauge factor of 2.0 on a 120 Ω gauge with 5 V excitation, which
are ordinary values; the beam's stiffness is chosen so that the full slider range covers a
plausible ±3 400 µε.
