const login = require('../login'); // Adjust the path as necessary

test('login with valid credentials', () => {
	expect(login('validUser', 'validPassword')).toBe(true);
});

test('login with invalid credentials', () => {
	expect(login('invalidUser', 'invalidPassword')).toBe(false);
});

test('login with empty username', () => {
	expect(login('', 'somePassword')).toBe(false);
});

test('login with empty password', () => {
	expect(login('someUser', '')).toBe(false);
});