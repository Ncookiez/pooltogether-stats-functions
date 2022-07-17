# PoolTogether Stats Functions

Cloud functions to automatically update PoolTogether stats.

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)

---

## Functions

### Scheduled Query Functions

These are multiple chain-specific scheduled cloud functions, querying for all updated data on a chain since its last runtime.

This data is saved in storage buckets on Firebase, where they can be easily queried.

Currently, these functions run every `6 hours`.

### API

This API is a cloud function facilitating data queries from front-end apps.

It's OpenAPI documentation can be found [here](#TODO).

## Self-Deployment

These cloud functions are ready for deployment through Firebase:

1. Install dependencies by navigating to the `functions` folder and using `npm i`.

2. Add your project ID in `.firebaserc` (an example file is provided).

3. Create a storage bucket and set its name on `functions/index.ts`.

4. Use `firebase deploy` to deploy the functions.