<?php

/*
|--------------------------------------------------------------------------
| SEC-8: security headers and the CORS allowlist
|--------------------------------------------------------------------------
*/

it('sends strict security headers on every API response', function (): void {
    $response = $this->getJson('/api/v1/health')->assertOk();

    expect($response->headers->get('content-security-policy'))
        ->toBe("default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
        ->and($response->headers->get('x-content-type-options'))->toBe('nosniff')
        ->and($response->headers->get('x-frame-options'))->toBe('DENY')
        ->and($response->headers->get('referrer-policy'))->toBe('strict-origin-when-cross-origin')
        ->and($response->headers->get('permissions-policy'))
        ->toBe('camera=(), microphone=(), geolocation=(), payment=()')
        ->and($response->headers->get('cross-origin-opener-policy'))->toBe('same-origin')
        ->and($response->headers->get('cross-origin-resource-policy'))->toBe('same-site')
        // HSTS on plain HTTP would lock a developer out of localhost.
        ->and($response->headers->get('strict-transport-security'))->toBeNull();
});

it('adds HSTS only to HTTPS responses', function (): void {
    $this->get('https://localhost/api/v1/health')
        ->assertOk()
        ->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});

it('allows only the configured browser origins through CORS', function (): void {
    // Two origins force the dynamic allowlist branch (a single allowed origin
    // is emitted verbatim and browsers still compare it to their own origin).
    config(['cors.allowed_origins' => ['http://localhost:3000', 'http://localhost:3001']]);

    $allowed = $this->withHeaders(['Origin' => 'http://localhost:3000'])
        ->getJson('/api/v1/products');

    $allowed->assertOk()
        ->assertHeader('access-control-allow-origin', 'http://localhost:3000');

    expect($allowed->headers->get('access-control-allow-credentials'))->toBe('true');

    $blocked = $this->withHeaders(['Origin' => 'https://evil.test'])
        ->getJson('/api/v1/products');

    $blocked->assertOk()->assertHeaderMissing('access-control-allow-origin');
});

it('answers a CORS preflight for an allowed origin without a wildcard', function (): void {
    config(['cors.allowed_origins' => ['http://localhost:3000']]);

    $response = $this->call('OPTIONS', '/api/v1/products', [], [], [], [
        'HTTP_ORIGIN' => 'http://localhost:3000',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
    ]);

    expect($response->headers->get('access-control-allow-origin'))->toBe('http://localhost:3000');
    expect($response->headers->get('access-control-allow-methods'))->toContain('GET');
    expect($response->headers->get('access-control-allow-methods'))->not->toContain('*');
});
