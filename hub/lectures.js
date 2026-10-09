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
    blurb: 'What the subject is, how the course runs, and the mathematics the rest of ' +
           'the term assumes you have — every identity, law and worked example on ' +
           'his slides evaluated rather than asserted. Two of them do not hold, and both ' +
           'are shown by drawing the answer rather than by correcting the arithmetic. ' +
           'The anatomical planes sit on a measured walking stride, and his ' +
           'lecture-topic list is a map of the eighteen decks that now exist.',
    slides: 29, widgets: 9, updated: '2026-10-08',
    handout: 'handout.pdf',
    live: [['the whole course, as a map', 'w-topics'],
           ['his eleven steps, run once', 'w-method'],
           ['twenty-four identities, checked', 'w-exponents'],
           ['three equations, with the answer drawn', 'w-solver'],
           ['where the three graphs come from', 'w-unitcircle'],
           ['one triangle, all three relations', 'w-triangle'],
           ['his two worked examples, to scale', 'w-trigex'],
           ['the planes, on somebody walking', 'w-axes3'],
           ['twenty-nine questions from the Tutor', 'w-tutorq1a']] },

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
    blurb: 'Impulse \u2014 the time side of force \u2014 read off a jump, then integrated once more ' +
           'into the kinematics, and friction from a stuck crate to a hiker on a 35\u00b0 trail.',
    slides: 53, widgets: 11, updated: '2026-09-30',
    handout: 'handout.pdf',
    live: [['impulse as an area you can reshape', 'w-impulse'],
           ['a countermovement jump in four steps', 'w-jump'],
           ['a measured jump, integrated twice', 'w-jumpkin'],
           ['jump height two ways, agreeing to 7 mm', 'w-jumpcheck'],
           ['the jumper in 3D, 22 measured joints', 'w-jump3d'],
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

  { n: '9', title: 'Work, energy and power',
    path: 'lectures/09-work-energy-power',
    blurb: 'The framework first \u2014 work, the three energies and power, and how they are ' +
           'related \u2014 then nine worked problems, then where it all shows up in the body: ' +
           'generation and absorption, joint power, the Achilles, and one measured jump.',
    slides: 66, widgets: 21, updated: '2026-10-01',
    handout: 'handout.pdf',
    live: [['the two integrals of one force record', 'w-workarea'],
           ['the map: work, energy and power', 'w-wepmap'],
           ['the sign of work, on a dial', 'w-workangle'],
           ['double the speed, four times the energy', 'w-kecurve'],
           ['net work becoming kinetic energy', 'w-wet'],
           ['the reference height you get to choose', 'w-pegrav'],
           ['a tendon and an elastic band on one curve', 'w-spring'],
           ['kinetic into potential and back again', 'w-conserve'],
           ['one lift, three formulas for power', 'w-power3'],
           ['the Margaria-Kalamen test with your own numbers', 'w-margaria'],
           ['try to make the mass matter', 'w-masscancels'],
           ['the helmet, and why crumple distance is everything', 'w-crumple'],
           ['joint power in four quadrants', 'w-jointpower'],
           ['force, velocity, and where power actually peaks', 'w-fvp'],
           ['peak power across nine activities, on a log axis', 'w-powerbars'],
           ['the power–duration curve and critical power', 'w-pdcurve'],
           ['the Achilles storing and returning energy', 'w-ssc'],
           ['countermovement against squat jump', 'w-cmjsj'],
           ['walking as a pendulum, measured', 'w-walkenergy'],
           ['the five phases of a countermovement jump', 'w-cmjphases'],
           ['the measured jump, as force against displacement', 'w-jumpwork'],
           ['the whole lecture read off one jump', 'w-energymap']] },

  { n: '12', title: 'Muscle mechanics',
    path: 'lectures/12-muscle-mechanics',
    blurb: 'Where force actually comes from — filament overlap, pennation and the moment ' +
           'arm — then the three reductionist properties one at a time, assembled into ' +
           'F = F₀·a·Fₗ·Fᵥ and finally into a work loop.',
    slides: 39, widgets: 11, updated: '2026-10-03',
    handout: 'handout.pdf',
    live: [['the sliding filament, and what sets the force', 'w-sarcomere'],
           ['what pennation buys and what it costs', 'w-pennation'],
           ['force is not torque — the moment arm through the range', 'w-momentarm'],
           ['the three-element model, activated and stretched', 'w-ccpec'],
           ['force–length: active, passive and total', 'w-flcurve'],
           ['force–velocity, both halves', 'w-fvcurve'],
           ['the twitch, in three different muscles', 'w-twitch'],
           ['activation against excitation — 10 ms up, 40 ms down', 'w-actdyn'],
           ['force as a surface over length and velocity', 'w-flvsurface'],
           ['the model equation, as four dials', 'w-musclemodel'],
           ['the work loop, and what timing does to it', 'w-workloop']] },

  { n: '10', title: 'Angular kinematics',
    path: 'lectures/10-angular-kinematics',
    blurb: 'Absolute against relative angles, the planar covariation law on a measured ' +
           'stride, what a radian actually is, and the three angular quantities with ' +
           'their linear partners — l = rθ, v = rω, a = rα — ending with a gyroscope ' +
           'on a racing wheelchair wheel and a force–velocity profile built from its trace.',
    slides: 56, widgets: 14, updated: '2026-10-03',
    handout: 'handout.pdf',
    live: [['absolute against relative angles', 'w-angles'],
           ['the planar covariation law, on a measured stride', 'w-covar'],
           ['what a radian is, by laying the radius on the rim', 'w-radian'],
           ['predicted sprint kinematics, from speed and leg length', 'w-sprintkin'],
           ['one angle, two points, two distances', 'w-arclen'],
           ['tangential velocity, and why a longer bat is faster', 'w-tangential'],
           ['the hammer throw — set ω and r, then release', 'w-hammerv'],
           ['centripetal acceleration — then cut the wire and watch it fly straight', 'w-centripetal'],
           ['tangential and radial, combined', 'w-atotal'],
           ['the bicycle wheel, all six steps in one column', 'w-bikewheel'],
           ['roll, pitch and yaw inside a MEMS gyroscope', 'w-gyromems'],
           ['a gyroscope reading turned into km/h', 'w-gyroconv'],
           ['the measured wheelchair trace, in four units', 'w-wcdata'],
           ['a force–velocity profile fitted to that sprint', 'w-wcfv']] },

  { n: '11', title: 'General kinematics',
    path: 'lectures/11-general-kinematics',
    blurb: 'What happens to angular kinematics once the joint you are rotating about ' +
           'is itself on the move: V A/G = V A/B + V B/G, resolved into components, ' +
           'applied to a bicycle wheel and a pitcher\u2019s arm, then chained down a ' +
           'two-segment limb and checked against one measured walking stride.',
    slides: 33, widgets: 8, updated: '2026-10-05',
    handout: 'handout.pdf',
    live: [['the same segment, seen from the joint and from the ground', 'w-frames'],
           ['adding the two vectors, tip to tail', 'w-vsum'],
           ['breaking each vector into x and y', 'w-comps'],
           ['every point on a rolling wheel at once', 'w-wheel'],
           ['why the angle is 90\u00b0 \u2212 \u03b8, not \u03b8', 'w-zpat'],
           ['the pitcher\u2019s arm, the whole problem live', 'w-pitcher'],
           ['two segments, one chain', 'w-chain'],
           ['one real stride, built from the chain', 'w-gait']] },

  { n: '14', title: 'Electromyography',
    path: 'lectures/14-electromyography',
    blurb: 'The electrical signal a contracting muscle leaves behind: motor units and the ' +
           'Henneman size principle, the same action potential read by two electrodes at ' +
           'different times and subtracted, what that subtraction cancels and what it cannot, ' +
           'where on the muscle to put the pair, the band-pass \u2192 rectify \u2192 envelope chain run ' +
           'on a real vastus lateralis burst, EMG through a measured walking stride, and what ' +
           'fatigue does \u2014 and does not do \u2014 to the signal.',
    slides: 63, widgets: 9, updated: '2026-10-06',
    handout: 'handout.pdf',
    live: [['three motor units, recruited in size order', 'w-mu'],
           ['120 units, one electrode, and the interference pattern', 'w-recruit'],
           ['one action potential, read twice and subtracted', 'w-travel'],
           ['move the pair along the muscle and watch it cancel', 'w-place'],
           ['band-pass, rectify, RMS, envelope on a real burst', 'w-chain'],
           ['a measured stride with the muscles playing', 'w-gait'],
           ['why force arrives after the signal', 'w-emd'],
           ['why slowing the wave lowers the frequency', 'w-mf'],
           ['six real recordings, and what they do not show', 'w-fatigue']] },

  { n: '15', title: 'Angular kinetics 1',
    path: 'lectures/15-angular-kinetics-1',
    blurb: 'Torque and moment of force: the moment arm is the perpendicular distance to ' +
           'the line of action, either route \u2014 resolve the distance or resolve the force ' +
           '\u2014 gives the same answer, and joint angle changes what a muscle can do before ' +
           'any physiology is involved. Then the ground reaction force vector through a ' +
           'measured stride: which side of each joint it passes, the moments it does and ' +
           'does not account for, and the three trunk-bending compensations as one ' +
           'manoeuvre about three different axes.',
    slides: 39, widgets: 18, updated: '2026-10-07',
    handout: 'handout.pdf',
    live: [['two routes to the same moment', 'w-torque'],
           ['balancing a lever', 'w-lever'],
           ['worked example: the moment about O', 'w-moment-o'],
           ['the biceps through the range', 'w-elbow'],
           ['worked example: the biceps at the elbow', 'w-biceps'],
           ['the measured force vector, and its moment', 'w-grfv'],
           ['the ground alone, against inverse dynamics', 'w-chain'],
           ['angles, moments and muscles, one stride', 'w-moments'],
           ['what a lateral lean is worth at the hip', 'w-trend'],
           ['moving the line of action', 'w-lean']] },

  { n: '16', title: 'Gait analysis',
    path: 'lectures/16-gait-analysis',
    blurb: 'Walking, measured end to end. The cycle and its phases from a recorded stride; ' +
           'the temporal and spatial variables and what each definition quietly decides; ' +
           'motion capture and the link-segment model; all three components of the ground ' +
           'reaction force, the butterfly of vectors and the path of the centre of pressure; ' +
           'angle, moment and EMG read together, one joint at a time, and the support moment ' +
           'two people make in visibly different ways; the inverted pendulum and what it does ' +
           'not recover; and the one or two centimetres of toe clearance the four common ' +
           'compensations exist to defend.',
    slides: 56, widgets: 11, updated: '2026-10-07',
    handout: 'handout.pdf',
    live: [['the gait cycle, from a recorded walk', 'w-cycle'],
           ['the footprint diagram, measured', 'w-spatial'],
           ['how symmetric is a normal walk', 'w-asym'],
           ['angle, moment and muscle at one joint', 'w-joint'],
           ['all three force components, measured', 'w-grf'],
           ['the butterfly of force vectors', 'w-fan'],
           ['the path under the foot', 'w-cop'],
           ['three joints, one support moment', 'w-support'],
           ['is a person actually a pendulum', 'w-pendulum'],
           ['buying clearance at midswing', 'w-clear']] },

  { n: '17', title: 'Angular kinetics 2: centre of gravity',
    path: 'lectures/17-angular-kinetics-2',
    blurb: 'One sum, \u03a3(m\u00b7r)/\u03a3m, and where the numbers that go into it come ' +
           'from. The weighted average in one dimension and then in two, and why the net ' +
           'torque about the answer is zero; Dempster\u2019s cadavers, Winter\u2019s table, ' +
           'and the scanners that replaced the saw; the reaction board, worked from one scale ' +
           'reading; the table run on two real standing poses, which put the centre of gravity ' +
           'at 55.1% and 55.4% of each person\u2019s own height; a body that changes shape ' +
           'every time it moves; the moment the ground reaction force makes about the centre ' +
           'of gravity through a measured stance; why quiet standing needs the centre of ' +
           'pressure to overshoot; and a force through the centre against a force that misses it.',
    slides: 35, widgets: 9, updated: '2026-10-08',
    handout: 'handout.pdf',
    live: [['is it really 55% of your height', 'w-height'],
           ['the weighted average, and the torques about it', 'w-cofg1d'],
           ['the same sum, run twice', 'w-cofg2d'],
           ['Winter\u2019s table, on any body mass', 'w-segtable'],
           ['one scale reading, one centre of gravity', 'w-board'],
           ['move a limb, move the whole-body CofG', 'w-posable'],
           ['the moment about the CofG through stance', 'w-copcom'],
           ['why the centre of pressure overshoots', 'w-balance'],
           ['through the centre, and off it', 'w-freeaxis']] },

  { n: '18', title: 'Angular kinetics 3: moment of inertia and angular momentum',
    path: 'lectures/18-angular-kinetics-3',
    blurb: 'Newton\u2019s three laws rewritten for things that turn, and the one quantity a ' +
           'person can change at will. I = \u03a3mr\u00b2 with the masses draggable, so the ' +
           'squaring on r is something you watch rather than something you are told; the ' +
           'radius of gyration as the same number written differently; the parallel-axis ' +
           'theorem swept across every axis of a real body, which is why a free object turns ' +
           'about its centre of gravity; his slide 21\u2019s five positions recomputed on one ' +
           'measured person; a real runner\u2019s knee folding to make the swing leg 26% ' +
           'cheaper to turn; a measured flight phase where the centre of mass falls at 9.71 ' +
           'm/s\u00b2 and the angular momentum is therefore frozen; the skater, the diver, ' +
           'and the angular impulse that bought the whole thing on the board.',
    slides: 32, widgets: 10, updated: '2026-10-08',
    handout: 'handout.pdf',
    live: [['I = \u03a3mr\u00b2, with the masses draggable', 'w-sumr'],
           ['the radius of gyration', 'w-gyration'],
           ['why a free body turns about its CofG', 'w-minaxis'],
           ['his slide 21, on a real body', 'w-posable3'],
           ['the sprinter\u2019s folded knee, measured', 'w-swingleg'],
           ['a measured flight phase', 'w-airborne'],
           ['the skater, and a sanity check', 'w-skater'],
           ['how many somersaults fit in the air', 'w-divespin'],
           ['the whole-body sum, segment by segment', 'w-gymtable'],
           ['angular impulse on the board', 'w-angimp']] },

  { n: '19', title: 'Static analysis',
    path: 'lectures/19-static-analysis',
    blurb: 'Two conditions, three equations, and the forces inside a body that nobody can ' +
           'measure. Why \u03a3F = 0 and \u03a3M = 0 are both needed and neither implies the ' +
           'other; the joint reaction, which carries the load AND the muscle; the free body ' +
           'diagram built the way he builds it; and then his own force table from slides 18 ' +
           'to 27, filling itself in cell by cell and solving live \u2014 M = 6488 N, ' +
           'R\u2093 = 5040 N, R\u1d67 = 3810 N, the same as his printed answers to the ' +
           'newton, with his givens on sliders. Why that number is so large (an 11 : 1 moment ' +
           'arm), three Tutor problems worked the same way, and the identical method run on a ' +
           'measured walking stance, which puts 3.7 body weights through the Achilles and 4.9 ' +
           'through the ankle while the floor pushes with 1.26.',
    slides: 20, widgets: 7, updated: '2026-10-08',
    handout: 'handout.pdf',
    live: [['both conditions, and why you need both', 'w-equilib'],
           ['what a joint really carries', 'w-jrf'],
           ['the free body diagram, step by step', 'w-fbd'],
           ['his force table, filling itself in', 'w-forcetable'],
           ['why 6488 N \u2014 the 11 : 1 lever', 'w-advantage'],
           ['three problems from the Tutor', 'w-tutorq'],
           ['the same method on a measured stance', 'w-achilles']] },

  { n: '20', title: 'Dynamic analysis',
    path: 'lectures/20-dynamic-analysis',
    blurb: 'Last week every equation had zero on the right-hand side; this week the ' +
           'zeros become ma and I\u03b1 and the method does not change. Dynamic ' +
           'equilibrium and when it does not hold; forward dynamics against inverse, ' +
           'and why only the inverse one can be done to a living person; why three ' +
           'equations and three unknowns force you to start at the segment touching ' +
           'the ground and work upward; the four moments that act on every segment ' +
           'and add to I\u03b1; the worked example line by line; and the whole method ' +
           'run on a measured stride and marked against the joint moments the people ' +
           'who recorded it published. Hover any term in an equation and it lights up ' +
           'on the diagram.',
    slides: 41, widgets: 9, updated: '2026-10-09',
    handout: 'handout.pdf',
    live: [['the same free body, with and without acceleration', 'w-newton'],
           ['the four forward-dynamics examples', 'w-fwd'],
           ['why the order is forced', 'w-chain'],
           ['every segment carries four moments', 'w-moments4'],
           ['the free body on a measured stride', 'w-fbd20'],
           ['handing the ankle to the knee', 'w-uphill'],
           ['the worked example, every line', 'w-swing'],
           ['the method, against a published answer', 'w-walk20'],
           ['when do you need the dynamics?', 'w-dynstat']] },

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
