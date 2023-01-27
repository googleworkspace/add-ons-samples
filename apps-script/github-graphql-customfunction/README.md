# GitHub GraphQL Custom Function Add-on

This is aa sample add-on that provides a custom sheets function
for calling GitHub's GraphQL API. The add-on demonstrates
several concepts for building Google Sheets Add-ons:

* Calling OAuth authenticated APIs in the context of
  custom functions
* Using UI services to read/write cells for editing complex
  custom functions.
* Developing add-ons using modern Javascript/Typescript language
  features and tooling.

Note: This is not an officially supported Google product.

## Setup

The add-on can be deployed as either a sheet-bound script or as a
standalone script that is deployed as an [add-on published via the Google Workspace Marketplace](https://developers.google.com/apps-script/add-ons/how-tos/publish-add-on-overview). 

For development:

* [Create a new Google Sheet and bound script.](https://developers.google.com/apps-script/guides/projects#create_a_project_from_google_docs_sheets_or_slides).
* Edit `.clasp.dev.json` and replace the `scriptId` property
  with the ID of your script.

For production:

* [Create a standalone script.](https://developers.google.com/apps-script/guides/projects#create_a_project_from_google_drive)
* Edit `.clasp.json` and replace the `scriptId` property
  with the ID of your script.

## Building

1. Install dependencies:

```sh
npm i
```

1. Build the app:

```sh
npm run build
```

1. Deploy

For development:

```sh
npm run deploy:dev
```

For production:
```sh
npm run deploy
```

### Building in watch mode

Run `npm run deploy:watch` to build in watch mode. The add-on will
build and deploy to the development script project whenever
local files are changed.

## GitHub Credentials

The sample requires a GitHub OAuth App to run.

* Follow the [Creating an OAuth App](https://docs.github.com/en/developers/apps/building-oauth-apps/creating-an-oauth-app) guide to create the application
* In the Apps Script project, set the script properties `CLIENT_ID` and `CLIENT_SECRET` with the respective values from GitHub.


## Project structure

* `./pages/` contains client-side HTML, javascript, and CSS files.
* `./server/` contains apps-script code executed server side
* `./shared/` contains shared files used across both environments

## Rollup.js config

While Apps Script supports modern Javascript syntax, the environment is different from Node.js and browser environments:

* Modules are not supported. All script files exist in the same namespace.
* Only HTML files can be served as web content. Scripts and CSS must be inlined or served from an external service.
* Built-ins are different from standard browser & Node.js environments.

This sample uses [Rollup.js](https://rollupjs.org/guide/en/) to bridge those gaps.

The `rollup.config.js` contains rules for processing source files
to make them compatible with the Apps Script environment.

For Apps Script code:

* The `@rollup/plugin-typescript` plugin enables Typescript support.
* The `@rollup/plugin-node-resolve` plugin allows importing NPM 
  packages. Any package that does not rely on node or browser
  globals should work correctly. Imported packages are inlined
  in the transpiled script.
* The `rollup-plugin-strip-exports` plugin removes `export` statements
  from entry points. This is combined with a custom plugin to
  disable tree shaking in entry points as they no longer have exported
  symbols.

For client-side HTML:

* Both Typescript & Node resolution modules are enabled
* The `@web/rollup-plugin-html` plugin is used to process
  any local CSS and JS files included in HTML files. This is
  combined with an extension to inline those resources so they're
  served as a single file.
* Each HTML file is defined as a separate entry point to prevent
  chunking of shared code.

The `dist/` directory contains the transpiled code after the build is run.



