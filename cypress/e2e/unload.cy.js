// After a form submit that navigates, Cypress should wait for the new page before running the next
// command. cy.url() is read without retrying (like a "did the login redirect?" check) to expose
// whether Cypress noticed the navigation.
const submitLoginAndReadUrl = () => {
    cy.visit('/login')
    cy.get('input[name=user]').type('someone')
    cy.get('button[type=submit]').click()
    cy.url().then((url) => {
        expect(url, 'URL right after submit').to.include('/done')
    })
}

describe('navigation detection after a page with Permissions-Policy: unload=()', () => {
    it('control: waits for the submit navigation when no page sent the header', () => {
        cy.visit('/plain')
        submitLoginAndReadUrl()
    })

    it('waits for the submit navigation after leaving a page that sent unload=()', () => {
        cy.visit('/app')
        submitLoginAndReadUrl()
    })

    it('waits for the submit navigation in a later test of the same spec', () => {
        submitLoginAndReadUrl()
    })
})
