import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';

const API = 'http://localhost:4000';

test('Bezpieczeństwo – endpoint chroniony wymaga uwierzytelnienia', async () => {
    const res = await request(API).get('/api/portfolio');

    assert.ok(
        res.statusCode === 401 || res.statusCode === 403,
        `Oczekiwano 401/403, otrzymano ${res.statusCode}`
    );
});

test('Bezpieczeństwo – próba SQL injection jest odrzucana', async () => {
    const res = await request(API)
        .post('/api/login')
        .send({
            email: "' OR 1=1 --",
            password: "' OR 1=1 --"
        });

    assert.notStrictEqual(
        res.statusCode,
        200,
        'Próba SQL injection nie powinna zakończyć się sukcesem (200)'
    );
});
