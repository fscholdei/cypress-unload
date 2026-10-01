# Cypress: navigation no longer detected after a page with `Permissions-Policy: unload=()`

Minimal reproduction. No dependencies besides Cypress; `cypress.config.js` starts the small app in `server.js`.

```
npm install
npx cypress run                    # Electron
npx cypress run --browser chrome
```

or without a local install:

```
docker run --rm --network host -v $PWD:/e2e -w /e2e cypress/included:16.1.0
docker run --rm --network host -v $PWD:/e2e -w /e2e cypress/included:13.17.0
```

### Testing other Cypress versions

`test-version.sh` installs each given version into its own directory under `versions/<version>/` (ignored by
git), copies the repro into it and runs it. Installed versions are reused on later runs.

```
./test-version.sh 14.5.4 15.0.0              # Electron (default)
./test-version.sh 15.0.0 16.1.0 -- chrome    # another browser installed on the host
npm view cypress versions                    # list available versions
```

Each version prints one line, for example `15.0.0 electron: 1 passing 2 failing`. The full output is in
`versions/<version>/run-<browser>.log`, and npm errors in `versions/<version>/install.log`. Older versions may
not support the Node.js version on the host.

To check a version in the official Docker image instead (which includes Chrome and Firefox), with no local install:

```
docker run --rm --network host -v $PWD:/e2e -w /e2e cypress/included:<version> --browser chrome
```

## Current behavior

Once the application under test has shown a page that responds with `Permissions-Policy: unload=()` and the
browser navigated away from it, Cypress no longer notices navigations in that spec. A form submit through
`cy.click()` is no longer awaited, so the following command runs while the old page is still shown:

```
AssertionError: URL right after submit: expected 'http://localhost:3000/login' to include '/done'
```

This also affects all later tests in the same spec, even though they never visit the page with the header.

## Desired behavior

`cy.click()` on a submit button waits for the resulting page load as usual, whether or not an earlier page
disabled `unload` listeners for its own document. This is what Cypress 13.17.0 does.

## Results

| Version | Browser  | control | after `unload=()` page | later test in same spec |
|---------|----------|---------|------------------------|-------------------------|
| 13.17.0 | Electron | pass    | pass                   | pass                    |
| 14.5.4  | Electron | pass    | pass                   | pass                    |
| 15.0.0  | Electron | pass    | **fail**               | **fail**                |
| 15.21.1 | Electron | pass    | **fail**               | **fail**                |
| 16.1.0  | Electron | pass    | **fail**               | **fail**                |
| 16.1.0  | Chrome   | pass    | **fail**               | **fail**                |
| 16.1.0  | Firefox  | pass    | pass                   | pass                    |

Firefox does not support the `unload` permissions policy, so it behaves like the control case.

This is a regression in 15.0.0: 14.5.4 is the last release that passes, and every release tested from 15.0.0
through 16.1.0 fails. A likely cause is this 15.0.0 breaking change: "The application under test's `pagehide`
event in Chromium browsers will no longer trigger Cypress's `window:unload` event"
([#31853](https://github.com/cypress-io/cypress/pull/31853)). `pagehide` still fires when the policy blocks
`unload`, so before 15.0.0 Cypress still noticed that the page was left.

## Observations

Logging `window:before:unload`, `window:unload` and `window:load` shows the following. When leaving the page with
the header, `window:before:unload` fires but `window:unload` does not, because the policy blocks unload
listeners on that document. After that, `window:before:unload` and `window:unload` are never emitted again for
any page in the spec. `window:before:load` and `window:load` keep firing.

## Real-world impact

This happens with Portainer, which sends `unload=()` as part of its default `Permissions-Policy`. A login
helper that checks `cy.url()` after submitting a CAS login form read the URL of the login page and started a
second login against an already authenticated session.

## Workaround

Strip the directive in the tests:

```js
beforeEach(() => {
    cy.intercept({url: '/app*'}, (req) => {
        req.continue((res) => {
            const policy = res.headers['permissions-policy']
            if (policy) {
                res.headers['permissions-policy'] = policy.split(',')
                    .filter((directive) => !directive.trim().startsWith('unload='))
                    .join(',')
            }
        })
    })
})
```
