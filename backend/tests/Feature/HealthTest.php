<?php

it('reports a healthy service inside the standard envelope', function (): void {
    $response = $this->getJson('/api/v1/health');

    $response
        ->assertOk()
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'DENY')
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.status', 'ok')
        ->assertJsonPath('data.checks.database', true)
        ->assertJsonPath('data.checks.cache', true)
        ->assertJsonStructure([
            'success',
            'message',
            'data' => ['status', 'service', 'environment', 'timestamp', 'checks'],
            'meta',
            'errors',
        ]);
});

it('returns 404 in the standard envelope for unknown endpoints', function (): void {
    $this->getJson('/api/v1/does-not-exist')
        ->assertNotFound()
        ->assertJsonPath('success', false)
        ->assertJsonPath('message', 'Endpoint not found.')
        ->assertJsonPath('data', null);
});
