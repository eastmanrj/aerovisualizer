# Contributing to Aerovisualizer

## Github Issues

Please use our <a href="https://github.com/eastmanrj/aerovisualizer/issues">issues</a> board to ask quesions, submit a bug report, submit ideas, or participate in discussing others' ideas.

### Questions

Got a question?  Ask [here](https://github.com/eastmanrj/aerovisualizer/labels/question).

### Bug Reports

If you find a bug in Aerovisualizer, please tell us [here](https://github.com/eastmanrj/aerovisualizer/labels/bug).  Bugs include spelling and grammar errors, problems with displays and controls, and logic problems to name a few.

### Submit an Idea / Participate in Discussions

If you have an idea for how to improve Aerovisualizer, big or small, let us know [here](https://github.com/eastmanrj/aerovisualizer/labels/enhancement).  Provide your feedback for other people's ideas too. This is the place for lots of back and forth to flesh out a design before the coding starts.

## Contributing Code

After an idea for enhancement has been accepted, you can contribute in a couple of ways.

### Submit Code from Python, Matlab, C, Fortran, Other Languages

Aerovisualizer is written in Javascript. Even so, if you have some "back end" source code hidden away as part of a desktop program somewhere, just send it to us and we will adapt it to Javascript as long as you follow these guidelines:

- Read the discussion in [issues](https://github.com/eastmanrj/aerovisualizer/labels/enhancement) and understand how your code could fit into the final design.
- Know your code.  That is, know exactly what it is attempting to do.  No black boxes allowed!
- If your SLOC (software lines of code) is large, please break it up into smaller independent parts to submit separately.
- Comment your code thoroughly (but not excessively).  This is for everyone's benefit, including yours!
- DON'T PLAGIARIZE. People spend a lot of time and effort creating source code.  Please give them credit for it.  Small code snippets are fine.  DO NOT USE PROPRIETARY CODE.

### HTML / CSS / Javascript

If you know HTML, CSS, or Javascript and would like to contribute directly to our code, we have some other guidelines for you:

- All of the previous guidelines still apply.
- Code must be HTML, CSS, and Javascript only.
- Straight "vanilla" Javascript is preferred (no frameworks like React, Vue, or Angular).  If you really think that a Aerovisualizer would benefit from a framework and you know what your are doing, let us know. 
- Avoid importing third party modules.  This adds bloat and also dependencies.
- New code cannot break old code.
- Follow the established style.
- If your code requires 2D or 3D rendering, learn how to use the very popular [THREE.js](https://threejs.org) framework.  All 2D and 3D will use this.
- Know how to use Git and GitHub.  Fork Aerovisualizer, clone it, checkout a new branch, make your changes, add and commit, push to your fork, and open a pull request.

If you do not currently program in HTML, CSS, and Javascript, [udemy.com](https://udemy.com) offers some great courses at reasonable prices. Jonas Schmedtmann is an excellent instructor. 