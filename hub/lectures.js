/* ============================================================
   EPHE 341 — the lecture list that drives the front page.

   To publish a converted lecture, give its entry a `path` (the folder it
   lives in) and it moves from the list at the bottom of the page up into
   the cards at the top. Everything else is optional.

     path    folder, relative to this file's site root
     blurb   one or two sentences, shown on the card
     slides  slide count
     live    short labels for what is interactive or real in it
     handout a PDF inside the lecture folder, if you keep one there
     updated yyyy-mm-dd

   The un-converted entries below were read straight out of
   `2026/2020/Lectures/` and are in filename order, duplicate numbering and
   all. Prune them to the lectures you actually teach.
   ============================================================ */
window.EPHE341_LECTURES = [

  { n: '2', title: 'Sensors and data acquisition',
    path: 'lectures/02-sensors-and-data-acquisition',
    blurb: 'How a physical quantity becomes a number on a disk — the sensor, the calibration, ' +
           'and the run of electronics in between — and what each step throws away.',
    slides: 41, widgets: 28, updated: '2026-09-21',
    handout: 'handout.pdf',
    live: ['a strain gauge you can bend', 'analog against digital',
           'calibrate a force transducer', 'many sensors on one DAQ',
           'the three limits of an A/D', 'the sample-and-hold circuit'] },

  { n: '3', title: 'Calculus and kinematics',
    path: 'lectures/03-calculus-and-kinematics',
    blurb: 'How displacement, velocity and acceleration are tied together by slopes and areas — ' +
           'and what to do when you have measured one of them and need the others.',
    slides: 62, widgets: 55, updated: '2026-09-17',
    handout: 'handout.pdf',
    live: ['graphing calculator', 'curve fitting', 'a real 100 m final',
           'a phone accelerometer trial', 'a golf swing in motion capture'] },

  { n: '4', title: 'Forces',
    path: 'lectures/04-forces',
    blurb: 'What a push or a pull actually is, how to add several of them into one, and how we ' +
           'measure the forces we can reach — and approximate the ones we cannot.',
    slides: 48, widgets: 19, updated: '2026-09-18',
    handout: 'handout.pdf',
    live: ['anatomy of a force vector', 'F = ma', 'resolve the quadriceps forces',
           'weight on four worlds', 'a block on a slope you can tilt',
           'pressure against contact area', 'centre of pressure through a step',
           'heel strike against forefoot strike',
           'the four running clips'] },

  { n: '5', title: 'Signals',
    path: 'lectures/05-signals',
    blurb: 'Why a sample rate can lie to you, what a Fourier transform is actually for, and how ' +
           'filtering, smoothing and fitting each pull a different trick on the same noise.',
    slides: 25, widgets: 10, updated: '2026-09-18',
    handout: 'handout.pdf',
    live: ['sample a 10 Hz wave too slowly', 'the four components of a signal',
           'a moving average you can widen', 'polynomial against spline',
           'time domain beside frequency domain', 'low-pass, high-pass, band-pass',
           '25 + 50 Hz buried in noise', 'noise amplified by differentiation'] },

  { n: '6', title: 'Linear kinetics 1',
    path: 'lectures/06-linear-kinetics-1',
    blurb: 'Newton\u2019s three laws, momentum, and what actually decides how a collision ends \u2014 ' +
           'conservation on one side and the coefficient of restitution on the other.',
    slides: 45, widgets: 15, updated: '2026-09-18',
    handout: 'handout.pdf',
    live: ['static against dynamic equilibrium', 'momentum of a player and a cyclist',
           'a collision lab with every worked example in it', 'the drop test for restitution',
           'conservation in two dimensions', 'normal and tangent axes',
           'action and reaction on two different bodies'] },

  { n: '7', title: 'Linear kinetics 2',
    path: 'lectures/07-linear-kinetics-2',
    blurb: 'Impulse \u2014 the time side of force \u2014 read straight off a jump that reproduces the ' +
           'lecture\u2019s own numbers, and friction from a stuck crate to a hiker on a 35\u00b0 trail.',
    slides: 50, widgets: 8, updated: '2026-09-18',
    handout: 'handout.pdf',
    live: ['impulse as an area you can reshape', 'a countermovement jump in four steps',
           'ten activities on one force plate', 'static giving way to kinetic friction',
           'a free-body diagram on a slope you can tilt', 'the angle where the hiker slips'] },

  { n: '8', title: 'Projectile motion',
    path: 'lectures/08-projectile-motion',
    blurb: 'Why anything thrown on earth follows a parabola, the six equations that come out of ' +
           'integrating gravity twice, and every worked example from the hammer to the home run.',
    slides: 59, widgets: 14, updated: '2026-09-18',
    handout: 'handout.pdf',
    live: ['a parabola you can reshape, with the components drawn on it',
           'the straight-up toss as three stacked equations',
           '45\u00b0 for distance and 90\u00b0 for height, on one figure',
           'the hammer throw against the world record', 'the high jump, two ways',
           'the soccer ball step by step', 'Abreu\u2019s home run, rise and fall separately',
           'the platform jump and its two roots'] },

  /* ---- still PowerPoint ---- */
  { n: '1a', title: 'Intro and review' },
  { n: '1b', title: 'Linear kinematics review' },
  { n: '8',  title: 'Work, energy and power' },
  { n: '9',  title: 'Angular kinematics' },
  { n: '10', title: 'General kinematics' },
  { n: '11', title: 'Muscle mechanics' },
  { n: '12', title: 'Virtual Muscle Lab' },
  { n: '13', title: 'Electromyography' },
  { n: '14', title: 'Angular kinetics 1' },
  { n: '15', title: 'Gait analysis' },
  { n: '16', title: 'Angular kinetics 2' },
  { n: '17', title: 'Angular kinetics 3' },
  { n: '18', title: 'Static analysis' },
  { n: '19', title: 'Dynamic analysis' },
  { n: '22', title: 'Projectile motion' },
  { n: '23', title: 'Signals and LabVIEW' }
];
