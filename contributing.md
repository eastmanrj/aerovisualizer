# Contributing to Aerovisualizer

## Philosophy

You must follow these "rules" when contributing to **Aerovisualizer**:

1. New code cannot break old code
2. Code must be HTML/CSS/Javascript
3. Only "vanilla" Javascript (no frameworks like React or Vue)
4. Code must follow the established style and must include documentation that it easy to follow
5. 

### Performance

Aerovisualizer uses a 3D rendering.

### Simplicity

A developer should be able to quickly and easily learn to use the API.

Simplicity and a low barrier to entry are must-have features of every API. If you have any second thoughts about the complexity of a design, it is almost always much better to cut the feature from the current release and spend more time to get the design right for the next release.

You can always add to an API, you cannot ever remove anything from one. If the design does not feel right, and you ship it anyway, you are likely to regret having done so.

## Forum and Github issues

Since the very beginning, Babylon.js relies on a great forum and a tremendous community: [https://forum.babylonjs.com/](https://forum.babylonjs.com/). Please use the forum for **ANY questions you may have**.

Please use the Github issues (after discussing them on the forum) **only** for:

- Bugs
- Feature requests

We will try to enforce these rules as we consider the forum is a better place for discussions and learnings.

## Pull requests

We are not complicated people, but we still have some [coding guidelines](https://doc.babylonjs.com/divingDeeper/developWithBjs/approvedNamingConventions)
Before submitting your PR, just check that everything goes well by [creating the minified version](https://doc.babylonjs.com/advanced_topics/minifiedVer)

You should read the [how to contribute documentation](https://doc.babylonjs.com/divingDeeper/developWithBjs/howToStart) before working on your PR.

If you intend to only update the doc, this [documentation](https://doc.babylonjs.com/divingDeeper/developWithBjs/contributeToDocs) would detail the process.

To validate your PR, please follow these steps:

- Run "npm run build:dev" locally and make sure that no error is generated
- Make sure that all public functions and classes are commented using JSDoc/TSDoc syntax
- Run `npm run test:unit` for unit tests, and check the buildSystem.md file for information regarding the visualization tests.

## What should go where

In order to not bloat the core engine with unwanted or unnecessary features (that we will need to maintain forever), here is a list of questions you could ask yourself before submitting a new feature (or feature request) for Babylon.js core engine:

- Does my feature belong to a framework library?
- Can my feature be used by multiple different applications?
- Is there a general use case for this feature?
- Does this feature already exist in a similar framework?

