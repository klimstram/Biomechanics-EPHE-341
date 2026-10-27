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

  { n: '1a', title: 'Introduction and Review',
    path: 'lectures/01a-intro-and-review',
    blurb: 'What biomechanics is, how the course runs, and the mathematics and anatomy the ' +
           'rest of the term assumes.',
    slides: 58, widgets: 12, updated: '2026-10-26',
    handout: 'handout.pdf',
    live: [['one stride, and both kinds of force', 'w-walk'],
           ['the whole course, as a map', 'w-topics'],
           ['a measured jump, described', 'w-kinematics'],
           ['the same jump, explained', 'w-kinetics'],
           ['twenty-four identities, checked', 'w-exponents'],
           ['one triangle, all three relations', 'w-triangle'],
           ['the planes, on somebody walking', 'w-axes3'],
           ['every joint action, moved', 'w-joints']] },

  { n: '2', title: 'Sensors and data acquisition',
    path: 'lectures/02-sensors-and-data-acquisition',
    blurb: 'How a physical quantity becomes a number on a disk.',
    slides: 41, widgets: 28, updated: '2026-09-21',
    handout: 'handout.pdf',
    live: [['a strain gauge you can bend', 'w-strain'],
           ['analog against digital', 'w-sampling'],
           ['calibrate a force transducer', 'w-calib']] },

  { n: '3', title: 'Calculus and kinematics',
    path: 'lectures/03-calculus-and-kinematics',
    blurb: 'Displacement, velocity and acceleration, and how to get from any one of them ' +
           'to the others.',
    slides: 62, widgets: 55, updated: '2026-09-17',
    handout: 'handout.pdf',
    live: [['graphing calculator', 'w-grapher'],
           ['curve fitting', 'w-curvefit'],
           ['a real 100 m final', 'w-sprint']] },

  { n: '4', title: 'Forces',
    path: 'lectures/04-forces',
    blurb: 'What a force is, how several of them add into one, and how they are measured.',
    slides: 54, widgets: 22, updated: '2026-09-22',
    handout: 'handout.pdf',
    live: [['anatomy of a force vector', 'w-vector'],
           ['F = ma', 'w-fma'],
           ['a measured step in three dimensions', 'w-grf3d'],
           ['centre of pressure through a step', 'w-cop']] },

  { n: '5', title: 'Signals',
    path: 'lectures/05-signals',
    blurb: 'Sampling, filtering, and reading a signal in the frequency domain.',
    slides: 28, widgets: 13, updated: '2026-09-23',
    handout: 'handout.pdf',
    live: [['sample a 10 Hz wave too slowly', 'w-nyquist'],
           ['the four components of a signal', 'w-components'],
           ['time domain beside frequency domain', 'w-fourier'],
           ['four filters side by side, with their own response curves', 'w-filterwall']] },

  { n: '6', title: 'Linear kinetics 1',
    path: 'lectures/06-linear-kinetics-1',
    blurb: 'Newton’s three laws, momentum, and what decides how a collision ends.',
    slides: 55, widgets: 28, updated: '2026-09-29',
    handout: 'handout.pdf',
    live: [['static equilibrium on all three axes', 'w-equilibrium'],
           ['momentum of a player and a cyclist', 'w-momentum'],
           ['a collision lab with every worked example', 'w-collide']] },

  { n: '7', title: 'Linear kinetics 2',
    path: 'lectures/07-linear-kinetics-2',
    blurb: 'Impulse — the time side of force — and friction.',
    slides: 53, widgets: 11, updated: '2026-09-30',
    handout: 'handout.pdf',
    live: [['impulse as an area you can reshape', 'w-impulse'],
           ['a countermovement jump in four steps', 'w-jump'],
           ['static giving way to kinetic friction', 'w-friction']] },

  { n: '8', title: 'Projectile motion',
    path: 'lectures/08-projectile-motion',
    blurb: 'Why anything thrown follows a parabola, and the equations that come from it.',
    slides: 59, widgets: 14, updated: '2026-09-18',
    handout: 'handout.pdf',
    live: [['a parabola you can reshape, with the components drawn on it', 'w-parabola'],
           ['45\u00b0 for distance and 90\u00b0 for height, on one figure', 'w-angle'],
           ['Abreu\u2019s home run, rise and fall separately', 'w-homerun']] },

  { n: '9', title: 'Work, energy and power',
    path: 'lectures/09-work-energy-power',
    blurb: 'Work, energy and power, and where each one shows up in the body.',
    slides: 66, widgets: 21, updated: '2026-10-01',
    handout: 'handout.pdf',
    live: [['the map: work, energy and power', 'w-wepmap'],
           ['kinetic into potential and back again', 'w-conserve'],
           ['joint power in four quadrants', 'w-jointpower'],
           ['the whole lecture read off one jump', 'w-energymap']] },

  { n: '12', title: 'Muscle mechanics',
    path: 'lectures/12-muscle-mechanics',
    blurb: 'Where muscle force comes from: filament overlap, length, velocity and ' +
           'activation.',
    slides: 39, widgets: 11, updated: '2026-10-03',
    handout: 'handout.pdf',
    live: [['the sliding filament, and what sets the force', 'w-sarcomere'],
           ['force–length: active, passive and total', 'w-flcurve'],
           ['force–velocity, both halves', 'w-fvcurve'],
           ['the work loop, and what timing does to it', 'w-workloop']] },

  { n: '10', title: 'Angular kinematics',
    path: 'lectures/10-angular-kinematics',
    blurb: 'Angles, radians, and the three angular quantities with their linear partners.',
    slides: 56, widgets: 14, updated: '2026-10-03',
    handout: 'handout.pdf',
    live: [['absolute against relative angles', 'w-angles'],
           ['what a radian is, by laying the radius on the rim', 'w-radian'],
           ['centripetal acceleration — then cut the wire and watch it fly straight', 'w-centripetal']] },

  { n: '11', title: 'General kinematics',
    path: 'lectures/11-general-kinematics',
    blurb: 'Angular kinematics when the joint you are rotating about is itself moving.',
    slides: 33, widgets: 8, updated: '2026-10-05',
    handout: 'handout.pdf',
    live: [['the same segment, seen from the joint and from the ground', 'w-frames'],
           ['adding the two vectors, tip to tail', 'w-vsum'],
           ['one real stride, built from the chain', 'w-gait']] },

  { n: '14', title: 'Electromyography',
    path: 'lectures/14-electromyography',
    blurb: 'Recording muscle activity, and what the signal can and cannot tell you.',
    slides: 63, widgets: 9, updated: '2026-10-06',
    handout: 'handout.pdf',
    live: [['three motor units, recruited in size order', 'w-mu'],
           ['band-pass, rectify, RMS, envelope on a real burst', 'w-chain'],
           ['a measured stride with the muscles playing', 'w-gait']] },

  { n: '15', title: 'Angular kinetics 1',
    path: 'lectures/15-angular-kinetics-1',
    blurb: 'Torque and the moment arm, and the moments the ground reaction force makes.',
    slides: 39, widgets: 18, updated: '2026-10-07',
    handout: 'handout.pdf',
    live: [['two routes to the same moment', 'w-torque'],
           ['balancing a lever', 'w-lever'],
           ['the measured force vector, and its moment', 'w-grfv'],
           ['angles, moments and muscles, one stride', 'w-moments']] },

  { n: '16', title: 'Gait analysis',
    path: 'lectures/16-gait-analysis',
    blurb: 'Walking, measured end to end.',
    slides: 56, widgets: 11, updated: '2026-10-07',
    handout: 'handout.pdf',
    live: [['the gait cycle, from a recorded walk', 'w-cycle'],
           ['the footprint diagram, measured', 'w-spatial'],
           ['all three force components, measured', 'w-grf'],
           ['angle, moment and muscle at one joint', 'w-joint']] },

  { n: '17', title: 'Angular kinetics 2: centre of gravity',
    path: 'lectures/17-angular-kinetics-2',
    blurb: 'Finding the centre of gravity of a body, segment by segment.',
    slides: 35, widgets: 9, updated: '2026-10-08',
    handout: 'handout.pdf',
    live: [['the weighted average, and the torques about it', 'w-cofg1d'],
           ['Winter\u2019s table, on any body mass', 'w-segtable'],
           ['one scale reading, one centre of gravity', 'w-board']] },

  { n: '18', title: 'Angular kinetics 3: moment of inertia and angular momentum',
    path: 'lectures/18-angular-kinetics-3',
    blurb: 'Moment of inertia, angular momentum, and the one quantity a person can change ' +
           'at will.',
    slides: 32, widgets: 10, updated: '2026-10-08',
    handout: 'handout.pdf',
    live: [['I = \u03a3mr\u00b2, with the masses draggable', 'w-sumr'],
           ['the radius of gyration', 'w-gyration'],
           ['a measured flight phase', 'w-airborne']] },

  { n: '19', title: 'Static analysis',
    path: 'lectures/19-static-analysis',
    blurb: 'Static equilibrium, free body diagrams, and the forces inside a joint.',
    slides: 20, widgets: 7, updated: '2026-10-08',
    handout: 'handout.pdf',
    live: [['both conditions, and why you need both', 'w-equilib'],
           ['what a joint really carries', 'w-jrf'],
           ['the free body diagram, step by step', 'w-fbd']] },

  { n: '20', title: 'Dynamic analysis',
    path: 'lectures/20-dynamic-analysis',
    blurb: 'Inverse dynamics: joint forces and moments from motion and the ground force.',
    slides: 54, widgets: 12, updated: '2026-10-25',
    handout: 'handout.pdf',
    live: [['why the order is forced', 'w-chain'],
           ['the free body on a measured stride', 'w-fbd20'],
           ['the method, against a published answer', 'w-walk20'],
           ['the same method on a measured jump, in 2D and 3D', 'w-jump']] },

  /* ---- still PowerPoint ---- */
  { n: '1b', title: 'Linear kinematics review' },
  /* Work, energy and power was '8' here, clashing with projectile motion, and
     is now lecture 9 above. Everything from angular kinematics on has shifted
     by one so the converted decks stay sequential \u2014 these numbers no longer
     match the numbers in the source .pptx filenames. Change them here if you
     would rather they did. */
  { n: '13', title: 'Virtual Muscle Lab' },
  { n: '22', title: 'Projectile motion' },
  { n: '23', title: 'Signals and LabVIEW' }
];
