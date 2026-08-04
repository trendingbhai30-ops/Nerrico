// Nerrico Style Bible — built-in style definitions.
//
// Importing this module registers every built-in style (each file calls
// styleBible.register() at load — same pattern as remotion/motion/presets).
// Registration is also validation: a bad definition throws right here at
// import time, so a broken style can never reach the planner.
//
// 9 active styles + 2 declared-for-later (status 'future').

// The production defaults — each render style's codified shipped look.
import './cinematic.js'; //     default for renderStyle 'cinematic'
import './paper-collage.js'; // default for renderStyle 'vox'
import './luxury.js'; //        default for renderStyle 'luxury'

// The cinematic style family.
import './documentary.js';
import './ai-documentary.js';
import './history.js';
import './finance.js';
import './modern-tech.js';
import './minimal.js';

// Declared but not yet offered (status 'future').
import './pixar-style.js';
import './anime.js';
