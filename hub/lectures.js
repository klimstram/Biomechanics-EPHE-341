/* ============================================================
   EPHE 341 — the lecture list that drives the front page.

   To publish a converted lecture, give its entry a `path` (the folder it
   lives in) and it moves from the list at the bottom of the page up into
   the cards at the top. Everything else is optional.

     path    folder, relative to this file's site root
     blurb   one or two sentences, shown on the card
     slides  slide count
     live    what is interactive or real in it. Each entry is
             ['the label on the chip', 'the id of the slide it opens'].
             That id is on the <section> itself in the deck's index.html,
             so inserting a slide cannot break the link the way a slide
             number would. Drop the id (a plain string) for a chip that
             should not be clickable.
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
    live: [['a strain gauge you can bend', 'w-strain'],
           ['analog against digital', 'w-sampling'],
           ['calibrate a force transducer', 'w-calib'],
           ['many sensors on one DAQ', 'w-multisensor'],
           ['the three limits of an A/D', 'w-adclimits'],
           ['the sample-and-hold circuit', 'w-samplehold']] },

  { n: '3', title: 'Calculus and kinematics',
    path: 'lectures/03-calculus-and-kinematics',
    blurb: 'How displacement, velocity and acceleration are tied together by slopes and areas — ' +
           'and what to do when you have measured one of them and need the others.',
    slides: 62, widgets: 55, updated: '2026-09-17',
    handout: 'handout.pdf',
    live: [['graphing calculator', 'w-grapher'],
           ['curve fitting', 'w-curvefit'],
           ['a real 100 m final', 'w-sprint'],
           ['a phone accelerometer trial', 'w-imu'],
           ['a golf swing in motion capture', 'w-golf']] },

  { n: '4', title: 'Forces',
    path: 'lectures/04-forces',
    blurb: 'What a push or a pull actually is, how to add several of them into one, and how we ' +
           'measure the forces we can reach — and approximate the ones we cannot.',
    slides: 54, widgets: 22, updated: '2026-09-22',
    handout: 'handout.pdf',
    live: [['anatomy of a force vector', 'w-vector'],
           ['F = ma', 'w-fma'],
           ['tendon tension from a buckle transducer', 'w-tendon'],
           ['resolve the quadriceps forces one muscle at a time', 'w-vecsum'],
           ['weight on four worlds', 'w-weight'],
           ['a block on a slope you can tilt', 'w-incline'],
           ['the three anatomical planes, spun', 'w-planes3d'],
           ['a measured step in three dimensions', 'w-grf3d'],
           ['pressure against sensel count', 'w-pressure'],
           ['centre of pressure through a step', 'w-cop'],
           ['heel strike against forefoot strike', 'w-grf'],
           ['the four running clips', 'w-clips'],
           ['inverse dynamics and EMG at the ankle', 'w-invdyn']] },

  { n: '5', title: 'Signals',
    path: 'lectures/05-signals',
    blurb: 'Why a sample rate can lie to you, what a Fourier transform is actually for, and how ' +
           'filtering, smoothing and fitting each pull a different trick on the same noise.',
    slides: 28, widgets: 13, updated: '2026-09-23',
    handout: 'handout.pdf',
    live: [['sample a 10 Hz wave too slowly', 'w-nyquist'],
           ['the four components of a signal', 'w-components'],
           ['a moving average you can widen', 'w-smooth'],
           ['polynomial against spline', 'w-fit'],
           ['time domain beside frequency domain', 'w-fourier'],
           ['a signal built back up from its harmonics', 'w-synth'],
           ['one graph per component', 'w-terms'],
           ['four filters side by side, with their own response curves', 'w-filterwall'],
           ['25 + 50 Hz buried in ten times the noise, and dug back out', 'w-buried'],
           ['a measured heel marker differentiated twice', 'w-deriv'],
           ['wavelet event detection on a rowing hull accelerometer', 'w-wavelet']] },

  { n: '6', title: 'Linear kinetics 1',
    path: 'lectures/06-linear-kinetics-1',
    blurb: 'Newton\u2019s three laws, momentum, and what actually decides how a collision ends \u2014 ' +
           'conservation on one side and the coefficient of restitution on the other.',
    slides: 55, widgets: 28, updated: '2026-09-29',
    handout: 'handout.pdf',
    live: [['static equilibrium on all three axes', 'w-equilibrium'],
           ['dynamic equilibrium with a velocity trace', 'w-dyneq'],
           ['momentum of a player and a cyclist', 'w-momentum'],
           ['velocity of approach against separation', 'w-approach'],
           ['the one-dimensional collision, animated', 'w-blocks'],
           ['a collision lab with every worked example', 'w-collide'],
           ['the drop test, one real ball at a time', 'w-drop'],
           ['conservation in two dimensions', 'w-collide2d'],
           ['a strike that draws its own normal and tangent', 'w-strike2d'],
           ['the collision written down on x and y, then on normal and tangent', 'w-collideaxes'],
           ['the frame of reference turning to normal and tangent', 'w-rotframe'],
           ['action and reaction on two different bodies', 'w-reaction']] },

  { n: '7', title: 'Linear kinetics 2',
    path: 'lectures/07-linear-kinetics-2',
    blurb: 'Impulse \u2014 the time side of force \u2014 read straight off a jump that reproduces the ' +
           'lecture\u2019s own numbers, and friction from a stuck crate to a hiker on a 35\u00b0 trail.',
    slides: 50, widgets: 8, updated: '2026-09-18',
    handout: 'handout.pdf',
    live: [['impulse as an area you can reshape', 'w-impulse'],
           ['a countermovement jump in four steps', 'w-jump'],
           ['ten activities on one force plate', 'w-activity'],
           ['static giving way to kinetic friction', 'w-friction'],
           ['a free-body diagram on a slope you can tilt', 'w-slopefric'],
           ['the angle where the hiker slips', 'w-hiker']] },

  { n: '8', title: 'Projectile motion',
    path: 'lectures/08-projectile-motion',
    blurb: 'Why anything thrown on earth follows a parabola, the six equations that come out of ' +
           'integrating gravity twice, and every worked example from the hammer to the home run.',
    slides: 59, widgets: 14, updated: '2026-09-18',
    handout: 'handout.pdf',
    live: [['a parabola you can reshape, with the components drawn on it', 'w-parabola'],
           ['the straight-up toss as three stacked equations', 'w-vertical'],
           ['45\u00b0 for distance and 90\u00b0 for height, on one figure', 'w-angle'],
           ['the hammer throw against the world record', 'w-hammer'],
           ['the high jump, two ways', 'w-highjump'],
           ['the soccer ball step by step', 'w-soccer'],
           ['Abreu\u2019s home run, rise and fall separately', 'w-homerun'],
           ['the platform jump and its two roots', 'w-platform']] },

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
