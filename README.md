# Cypress: navigation no longer detected after a page with `Permissions-Policy: unload=()`

Minimal reproduction. No dependencies besides Cypress; `cypress.config.js` starts the small app in `server.js`.

```
npm install
npx cypress run                    # Electron
npx cypress run --browser chrome
```

or without a local install:

```
docker run --rm --network host -v $PWD:/e2e -w /e2e cypress/included:<version> [--browser chrome]
```

To run the repro against several Cypress versions, `test-version.sh` installs each into `versions/<version>/`
and prints one result line per version:

```
./test-version.sh 14.5.4 15.0.0 [-- chrome]
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
disabled `unload` listeners for its own document. This is what Cypress 14.5.4 does.

## Results

| Version | Browser  | control | after `unload=()` page | later test in same spec |
|---------|----------|---------|------------------------|-------------------------|
| 14.5.4  | Electron | pass    | pass                   | pass                    |
| 15.0.0  | Electron | pass    | **fail**               | **fail**                |
| 16.1.0  | Electron | pass    | **fail**               | **fail**                |
| 16.1.0  | Chrome   | pass    | **fail**               | **fail**                |
| 16.1.0  | Firefox  | pass    | pass                   | pass                    |

Firefox does not support the `unload` permissions policy, so it behaves like the control case.

This is a regression in 15.0.0. A likely cause is this 15.0.0 breaking change: "The application under test's
`pagehide` event in Chromium browsers will no longer trigger Cypress's `window:unload` event"
([#31853](https://github.com/cypress-io/cypress/pull/31853)). `pagehide` still fires when the policy blocks
`unload`, so before 15.0.0 Cypress still noticed that the page was left.

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

## License

[MIT](LICENSE)
