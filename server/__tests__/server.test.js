const request = require('supertest');
const app = require('../app');

describe('Server Setup', () => {
    it('should respond with a 200 status code', async () => {
        const response = await request(app).get('/');
        expect(response.statusCode).toBe(200);
    });

    it('should return JSON', async () => {
        const response = await request(app).get('/');
        expect(response.headers['content-type']).toEqual(expect.stringContaining('json'));
    });
});