<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // RefreshDatabase drops and re-creates every table. A cached config
        // (bootstrap/cache/config.php) would silently point the suite at the
        // development database, so refuse to run instead of destroying it.
        if (config('database.default') !== 'sqlite') {
            $this->fail(
                'The test suite must run against SQLite. '
                .'Run `php artisan config:clear` and retry.',
            );
        }
    }
}
