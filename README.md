# PoolTogether Stats Functions

Cloud functions to automatically update PoolTogether stats.

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)

---

## Functions

### Scheduled Data Query Functions

These are multiple chain-specific scheduled cloud functions, querying for all updated data on a chain since its last runtime.

This data is saved in storage buckets on Firebase, where they can be easily queried.

Currently, these functions run every `1 hour`.

### Scheduled Stats Query Functions

These are multiple chain-specific scheduled cloud functions, querying for wallet balances and aggregated stats for more efficient front-end queries.

These functions run 10 minutes after the initial data query functions.

### Scheduled Player Data Function

This function runs 10 minutes after all on-chain data and stats are queried, in order to parse through all the data acquired and organize it by player (wallet).

This data is neatly put into Firestore, where it can be easily queried.

### API

This API is a cloud function facilitating data queries from front-end apps.

It's OpenAPI documentation can be found [here](https://pooltogether-stats.web.app/docs).

## Self-Deployment

These cloud functions are ready for deployment through Firebase:

1. Install dependencies by navigating to the `functions` folder and using `npm i`.

2. Add your project ID in `.firebaserc` (an example file is provided).

3. Create a storage bucket and set its name on `functions/index.ts`.

4. Use `firebase deploy` to deploy the functions.

If you run into function deployment issues, try deploying each function individually through `firebase deploy --only functions:ethDataQueries`, for example.