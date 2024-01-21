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

Aerovisualizer is written in Javascript. Even so, if you have some "back end" source code hidden away as part of a desktop program somewhere, you can adapt it to Javascript as long as you follow these guidelines:

- Read the discussion in [issues](https://github.com/eastmanrj/aerovisualizer/labels/enhancement) and understand how your code could fit into the final design.
- Know your code.  That is, know exactly what it is attempting to do.  No black boxes are allowed!
- If your SLOC (software lines of code) is large, please break it up into smaller independent parts to submit separately.
- Comment your code thoroughly (but not excessively).  This is for everyone's benefit, including yours!
- DON'T PLAGIARIZE. People spend a lot of time and effort creating source code.  Please give them credit for it.  Small code snippets are fine.  DO NOT USE PROPRIETARY CODE.

### HTML / CSS / Javascript

If you know HTML, CSS, or Javascript and would like to contribute directly to our code, we have some other guidelines for you:

- All of the previous guidelines still apply.
- Code must be HTML, CSS, and Javascript only.
- Straight "vanilla" Javascript is preferred for now, but if you think that Aerovisualizer would benefit from a framework such as React, Vue, or Angular, and you know what you are doing, let us know. 
- Avoid importing third party modules.  This adds bloat and dependencies.
- New code cannot break old code.
- Follow the established style.
- If your code requires 2D or 3D rendering, learn how to use the very popular [THREE.js](https://threejs.org) framework.  All 2D and 3D stuff uses this.
- Know how to use Git and GitHub.  Clone Aerovisualizer, create a new branch, make your changes, add and commit, and open a pull request.

If you do not currently program in HTML, CSS, and Javascript, [udemy.com](https://udemy.com) offers some great courses at reasonable prices. Jonas Schmedtmann is an excellent instructor. 

### Dependencies

Aerovisualizer is designed to have a minimal number of code dependencies.  If you clone the repository, you must install the dependencies for it to work.  First make sure to have Node Package Manager (npm) installed on your computer.  Check this by typing the following at the command line:

npm list -g -depth 0

If npm is not listed, install it from nodejs.org.  Then, at the command line, cd into the top level of the cloned directory.  Type the following:

npm install --save three

Then, cd into one of the packages and run one of the scripts located in the package.json file there to start a local server.  For example, packages/orbital contains a package.json file with the script, startorbit.  You would create a local server by typing the following at the command line:

npm run startorbit

Then go to your browser and type "localhost:xxxx", where xxxx is given to you.
